<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddCartItemRequest;
use App\Http\Requests\CartCheckoutRequest;
use App\Http\Requests\VerifyCartCheckoutRequest;
use App\Http\Resources\CartResource;
use App\Http\Resources\VoteResource;
use App\Jobs\ProcessCartMpesaPaymentJob;
use App\Models\Campaign;
use App\Models\CampaignOption;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\PaymentTransaction;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Vote;
use App\Services\FraudDetectionService;
use App\Services\IpGeolocationService;
use App\Services\VoteEligibilityService;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function __construct(
        private readonly VoteEligibilityService $eligibility,
        private readonly IpGeolocationService $ipGeo,
        private readonly FraudDetectionService $fraud,
    ) {}

    /**
     * Best available geo-tag: precise browser coords → the user's stored location →
     * approximate IP-based location. Returns [latitude, longitude], either possibly null.
     *
     * @return array{0: float|null, 1: float|null}
     */
    private function resolveLocation(array $data, User $user, Request $request): array
    {
        $latitude = $data['latitude'] ?? $user->latitude ?? null;
        $longitude = $data['longitude'] ?? $user->longitude ?? null;

        if ($latitude === null || $longitude === null) {
            $located = $this->ipGeo->locate($request->ip());
            if ($located) {
                $latitude = $located['latitude'];
                $longitude = $located['longitude'];
            }
        }

        return [$latitude !== null ? (float) $latitude : null, $longitude !== null ? (float) $longitude : null];
    }

    public function show(Request $request)
    {
        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id, 'status' => 'open']);
        $cart->load(['items.campaign.category', 'items.campaignOption.nominee.subcategory']);

        return new CartResource($cart);
    }

    public function addItem(AddCartItemRequest $request)
    {
        $data = $request->validated();

        $campaign = Campaign::findOrFail($data['campaign_id']);
        $option = CampaignOption::with('nominee.subcategory')
            ->where('id', $data['option_id'])->where('campaign_id', $campaign->id)->firstOrFail();
        $user = $request->user();

        $this->eligibility->assertVotable($campaign, $option, $user);

        $cart = Cart::firstOrCreate(['user_id' => $user->id, 'status' => 'open']);

        if ($campaign->ranking_period_id) {
            $collides = $cart->items()
                ->where('campaign_id', '!=', $campaign->id)
                ->whereHas('campaign', fn ($q) => $q->where('ranking_period_id', $campaign->ranking_period_id))
                ->exists();

            if ($collides) {
                throw ValidationException::withMessages([
                    'campaign_id' => ['You already have a pick for this category in your cart.'],
                ]);
            }
        }

        CartItem::updateOrCreate(
            ['cart_id' => $cart->id, 'campaign_id' => $campaign->id],
            ['campaign_option_id' => $option->id],
        );

        return $this->show($request);
    }

    public function removeItem(Request $request, CartItem $item)
    {
        $cart = Cart::where('user_id', $request->user()->id)->where('status', 'open')->first();

        abort_unless($cart && $item->cart_id === $cart->id, 404);

        $item->delete();

        return $this->show($request);
    }

    public function checkout(CartCheckoutRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();

        $cart = Cart::where('user_id', $user->id)->where('status', 'open')
            ->with(['items.campaign', 'items.campaignOption.nominee.subcategory'])
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => ['Vote Box is empty. Chose a nominee']]);
        }

        foreach ($cart->items as $item) {
            $this->eligibility->assertVotable($item->campaign, $item->campaignOption, $user);
        }

        $rankingPeriodIds = $cart->items->pluck('campaign.ranking_period_id')->filter();
        if ($rankingPeriodIds->count() !== $rankingPeriodIds->unique()->count()) {
            throw ValidationException::withMessages([
                'cart' => ['Two of your selections belong to the same voting cycle.'],
            ]);
        }

        $settings = PlatformSetting::resolved();
        $requiresPayment = $settings['mpesa_enabled'] && ! empty($data['mpesa_phone']);

        // Geo-tag each vote: precise browser coords → the user's stored location → approximate
        // IP-based location, so a vote is always tagged even if location was declined.
        [$latitude, $longitude] = $this->resolveLocation($data, $user, $request);

        $votes = DB::transaction(function () use ($cart, $data, $user, $requiresPayment, $request, $latitude, $longitude) {
            $votes = collect();

            foreach ($cart->items as $item) {
                $vote = Vote::create([
                    'campaign_id' => $item->campaign_id,
                    'campaign_option_id' => $item->campaign_option_id,
                    'voter_user_id' => $user->id,
                    'ranking_period_id' => $this->eligibility->periodFor($item->campaignOption)?->id,
                    'vote_status' => $requiresPayment ? 'pending_payment' : 'verified',
                    'ip_address' => $request->ip(),
                    'user_agent' => (string) $request->userAgent(),
                    'county_id' => $data['county_id'] ?? null,
                    'subcounty_id' => $data['subcounty_id'] ?? null,
                    'ward_id' => $data['ward_id'] ?? null,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ]);

                if (! $requiresPayment) {
                    $item->campaignOption->increment('votes_count');
                    $item->campaignOption->nominee?->increment('votes_count');
                }

                $votes->push($vote);
            }

            $cart->update(['status' => 'checked_out']);

            return $votes;
        });

        $transactionId = null;

        if ($requiresPayment) {
            $transactionId = $this->initiateBatchPayment($cart, $votes, $data['mpesa_phone'], $user);
        } else {
            $votes->each(fn (Vote $vote) => $this->fraud->evaluate($vote));
        }

        $freshVotes = Vote::whereIn('id', $votes->pluck('id'))->with('option')->get();

        return response()->json([
            'transaction_id' => $transactionId,
            'votes' => VoteResource::collection($freshVotes),
        ]);
    }

    /**
     * Optional post-vote feedback for a checkout batch. Stored on every vote in the batch
     * (each already carries the voter's county/location), so it's inherently geo-tagged.
     */
    public function submitFeedback(Request $request)
    {
        $data = $request->validate([
            'transaction_id' => ['required', 'integer'],
            'feedback' => ['required', 'string', 'max:500'],
        ]);

        Vote::where('payment_transaction_id', $data['transaction_id'])
            ->where('voter_user_id', $request->user()->id)
            ->update(['feedback' => $data['feedback']]);

        return response()->json(['ok' => true]);
    }

    public function verifyCheckout(VerifyCartCheckoutRequest $request)
    {
        $data = $request->validated();

        $transaction = PaymentTransaction::with('votes.option')
            ->where('id', $data['transaction_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $status = match ($transaction->status) {
            'completed' => 'confirmed',
            'failed', 'cancelled' => 'failed',
            default => 'pending',
        };

        return response()->json([
            'status' => $status,
            'votes' => VoteResource::collection($transaction->votes),
        ]);
    }

    /**
     * Creates the pending transaction synchronously (so the frontend has an id to poll
     * immediately) and hands the actual STK push off to a queued job — Safaricom's API is
     * one more external call in the request path, and this keeps checkout responsive even
     * if Daraja is slow. ProcessCartMpesaPaymentJob::failed() handles the batch rollback if
     * every retry is exhausted.
     */
    private function initiateBatchPayment(Cart $cart, Collection $votes, string $phone, User $user): int
    {
        // One verification fee per vote slip — a 3-item cart owes 3x, not the single-vote rate.
        $fee = (float) config('mpesa.verification_fee') * $votes->count();
        $phone = PhoneNumber::normalize($phone);

        $transaction = PaymentTransaction::create([
            'user_id' => $user->id,
            'provider' => 'mpesa',
            'checkout_request_id' => null,
            'phone_number' => $phone,
            'amount' => $fee,
            'status' => 'pending',
        ]);

        Vote::whereIn('id', $votes->pluck('id'))->update(['payment_transaction_id' => $transaction->id]);

        ProcessCartMpesaPaymentJob::dispatch($transaction->id, $cart->id);

        return $transaction->id;
    }
}
