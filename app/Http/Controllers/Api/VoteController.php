<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CastVoteRequest;
use App\Http\Resources\VoteResource;
use App\Jobs\ProcessVoteMpesaPaymentJob;
use App\Models\Campaign;
use App\Models\CampaignAccessToken;
use App\Models\CampaignOption;
use App\Models\PaymentTransaction;
use App\Models\PlatformSetting;
use App\Models\Vote;
use App\Services\FraudDetectionService;
use App\Services\IpGeolocationService;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VoteController extends Controller
{
    public function __construct(
        private readonly IpGeolocationService $ipGeo,
        private readonly FraudDetectionService $fraud,
    ) {}

    /**
     * Tokenless private-campaign invite voting. Authenticated citizens vote on public
     * campaigns exclusively through the cart/checkout flow (see CartController).
     */
    public function cast(CastVoteRequest $request)
    {
        $data = $request->validated();

        $campaign = Campaign::findOrFail($data['campaign_id']);
        $option = CampaignOption::where('id', $data['option_id'])->where('campaign_id', $campaign->id)->firstOrFail();

        if (! $campaign->isPrivate()) {
            throw new HttpException(422, 'Public campaigns are voted on through the cart.');
        }

        if (empty($data['token'])) {
            throw new HttpException(403, 'This campaign requires an invite link.');
        }

        $accessToken = CampaignAccessToken::where('campaign_id', $campaign->id)
            ->where('token_hash', hash('sha256', $data['token']))
            ->first();

        if (! $accessToken || ! $accessToken->isUsable()) {
            throw new HttpException(403, 'Invalid or expired invite link.');
        }

        $settings = PlatformSetting::resolved();
        $requiresPayment = $settings['mpesa_enabled'] && ! empty($data['mpesa_phone']);

        // Geo-tag the vote with precise coords when supplied, otherwise an approximate
        // IP-based location — so the vote is tagged even if location was declined.
        [$latitude, $longitude] = $this->resolveLocation($data, $request);

        $vote = DB::transaction(function () use ($campaign, $option, $accessToken, $requiresPayment, $request, $data, $latitude, $longitude) {
            $vote = Vote::create([
                'campaign_id' => $campaign->id,
                'campaign_option_id' => $option->id,
                'campaign_access_token_id' => $accessToken->id,
                'ranking_period_id' => $campaign->ranking_period_id,
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
                $option->increment('votes_count');
                $option->nominee?->increment('votes_count');
            }

            $accessToken->update(['used_at' => now()]);

            return $vote;
        });

        if ($requiresPayment) {
            $this->initiatePayment($vote, $data['mpesa_phone']);
        } else {
            $this->fraud->evaluate($vote);
        }

        return new VoteResource($vote->fresh());
    }

    /**
     * Precise browser coords when supplied, otherwise approximate IP-based location.
     *
     * @return array{0: float|null, 1: float|null}
     */
    private function resolveLocation(array $data, Request $request): array
    {
        $latitude = $data['latitude'] ?? null;
        $longitude = $data['longitude'] ?? null;

        if ($latitude === null || $longitude === null) {
            $located = $this->ipGeo->locate($request->ip());
            if ($located) {
                $latitude = $located['latitude'];
                $longitude = $located['longitude'];
            }
        }

        return [$latitude !== null ? (float) $latitude : null, $longitude !== null ? (float) $longitude : null];
    }

    /**
     * The logged-in citizen's own vote history, used by the voting dashboard to mark
     * campaigns as already-voted.
     */
    public function mine(Request $request)
    {
        $votes = Vote::where('voter_user_id', $request->user()->id)
            ->with(['option.nominee', 'campaign:id,title', 'paymentTransaction'])
            ->orderByDesc('created_at')
            ->get();

        return VoteResource::collection($votes);
    }

    /**
     * Creates the pending transaction synchronously and hands the actual STK push off to a
     * queued job (see CartController::initiateBatchPayment for why). This flow doesn't poll
     * for payment status client-side, so there's no synchronous checkout_request_id to
     * return here. ProcessVoteMpesaPaymentJob::failed() marks the vote rejected if every
     * retry is exhausted.
     */
    private function initiatePayment(Vote $vote, string $phone): void
    {
        $fee = (float) config('mpesa.verification_fee');
        $phone = PhoneNumber::normalize($phone);

        $transaction = PaymentTransaction::create([
            'user_id' => $vote->voter_user_id,
            'provider' => 'mpesa',
            'checkout_request_id' => null,
            'phone_number' => $phone,
            'amount' => $fee,
            'status' => 'pending',
        ]);

        $vote->update(['payment_transaction_id' => $transaction->id]);

        ProcessVoteMpesaPaymentJob::dispatch($transaction->id, $vote->id);
    }
}
