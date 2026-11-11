<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessVoteMpesaPaymentJob;
use App\Models\Campaign;
use App\Models\CampaignOption;
use App\Models\OtpChallenge;
use App\Models\PaymentTransaction;
use App\Models\Vote;
use App\Services\IpGeolocationService;
use App\Services\OtpService;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Guest (no-account) voting. A visitor verifies a phone via OTP, then pays the same M-Pesa
 * verification fee as an account holder. A phone can vote in the same campaign as many times
 * as it likes — each vote is paid for and OTP-verified independently. Guest votes count
 * exactly like account votes — we just nudge them to sign up to see their history.
 */
class GuestVoteController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
        private readonly IpGeolocationService $ipGeo,
    ) {}

    /**
     * Step 1: send an OTP to the guest's phone. An optional backup email also gets the code
     * as a bonus channel, but since this phone goes on to receive an M-Pesa STK push, the SMS
     * itself must actually go out — a working backup email doesn't excuse an unreachable
     * number, so an SMS failure here is fatal rather than silently falling back to email-only.
     */
    public function sendOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $phone = PhoneNumber::normalize($data['phone']);

        try {
            $challenge = $this->otp->issueGuestChallenge($phone, $data['email'] ?? null);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'phone' => ['We could not send a code to that number. Please check it and try again.'],
            ]);
        }

        return response()->json([
            'challenge_id' => $challenge->id,
            'expires_in' => max(0, (int) now()->diffInSeconds($challenge->expires_at, false)),
        ]);
    }

    /** Step 2: verify the OTP and kick off the M-Pesa STK push for a single vote. */
    public function cast(Request $request)
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'string'],
            'otp' => ['required', 'string', 'size:4'],
            'campaign_id' => ['required', 'integer'],
            'option_id' => ['required', 'integer'],
            'mpesa_phone' => ['required', 'string', 'max:20'],
            'county_id' => ['nullable', 'integer'],
            'subcounty_id' => ['nullable', 'integer'],
            'ward_id' => ['nullable', 'integer'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $challenge = OtpChallenge::findOrFail($data['challenge_id']);

        // Must be a guest challenge (no user attached) — never let this path verify an
        // account holder's login/registration OTP.
        if ($challenge->user_id !== null || $challenge->phone === null) {
            throw new HttpException(403, 'Invalid verification challenge.');
        }

        if ($challenge->isVerified()) {
            throw ValidationException::withMessages(['otp' => ['This code has already been used. Request a new one.']]);
        }
        if ($challenge->isExpired()) {
            throw ValidationException::withMessages(['otp' => ['This code has expired. Request a new one.']]);
        }
        if ($challenge->attempts >= OtpService::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['otp' => ['Too many failed attempts. Request a new code.']]);
        }
        if (! $this->otp->verify($challenge, $data['otp'])) {
            throw ValidationException::withMessages(['otp' => ['That code is incorrect.']]);
        }

        $voterPhone = $challenge->phone;

        $campaign = Campaign::findOrFail($data['campaign_id']);
        if ($campaign->visibility !== 'public' || $campaign->status !== 'live') {
            throw new HttpException(422, 'This campaign is not open for public voting.');
        }

        $option = CampaignOption::where('id', $data['option_id'])
            ->where('campaign_id', $campaign->id)
            ->firstOrFail();

        $fee = (float) config('mpesa.verification_fee');
        $mpesaPhone = PhoneNumber::normalize($data['mpesa_phone']);

        // Geo-tag with precise coords when supplied, otherwise approximate IP-based location.
        $latitude = $data['latitude'] ?? null;
        $longitude = $data['longitude'] ?? null;
        if ($latitude === null || $longitude === null) {
            $located = $this->ipGeo->locate($request->ip());
            if ($located) {
                $latitude = $located['latitude'];
                $longitude = $located['longitude'];
            }
        }

        $vote = Vote::create([
            'campaign_id' => $campaign->id,
            'campaign_option_id' => $option->id,
            'voter_phone' => $voterPhone,
            'ranking_period_id' => $campaign->ranking_period_id,
            'vote_status' => 'pending_payment',
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'county_id' => $data['county_id'] ?? null,
            'subcounty_id' => $data['subcounty_id'] ?? null,
            'ward_id' => $data['ward_id'] ?? null,
            'latitude' => $latitude,
            'longitude' => $longitude,
        ]);

        $transaction = PaymentTransaction::create([
            'user_id' => null,
            'provider' => 'mpesa',
            'checkout_request_id' => null,
            'phone_number' => $mpesaPhone,
            'amount' => $fee,
            'status' => 'pending',
        ]);

        $vote->update(['payment_transaction_id' => $transaction->id]);

        ProcessVoteMpesaPaymentJob::dispatch($transaction->id, $vote->id);

        return response()->json(['transaction_id' => $transaction->id]);
    }

    /** Optional post-vote feedback, keyed by the paying phone. Geo-tagged via the vote's location. */
    public function submitFeedback(Request $request)
    {
        $data = $request->validate([
            'transaction_id' => ['required', 'integer'],
            'phone' => ['required', 'string', 'max:20'],
            'feedback' => ['required', 'string', 'max:500'],
        ]);

        $phone = PhoneNumber::normalize($data['phone']);

        // Confirm the phone owns this transaction before touching any votes.
        $transaction = PaymentTransaction::where('id', $data['transaction_id'])
            ->where('phone_number', $phone)
            ->firstOrFail();

        Vote::where('payment_transaction_id', $transaction->id)
            ->update(['feedback' => $data['feedback']]);

        return response()->json(['ok' => true]);
    }

    /** Step 3: poll payment status. Keyed by the paying phone so ids aren't trivially guessable. */
    public function status(Request $request)
    {
        $data = $request->validate([
            'transaction_id' => ['required', 'integer'],
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $phone = PhoneNumber::normalize($data['phone']);

        $transaction = PaymentTransaction::where('id', $data['transaction_id'])
            ->where('phone_number', $phone)
            ->firstOrFail();

        $status = match ($transaction->status) {
            'completed' => 'confirmed',
            'failed', 'cancelled' => 'failed',
            default => 'pending',
        };

        return response()->json(['status' => $status]);
    }
}
