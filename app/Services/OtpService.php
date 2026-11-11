<?php

namespace App\Services;

use App\Jobs\SendSmsJob;
use App\Mail\OtpCodeMail;
use App\Models\OtpChallenge;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class OtpService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public function __construct(private readonly AdvantaSmsService $sms)
    {
    }

    public function issueChallenge(User $user, string $type = 'registration'): OtpChallenge
    {
        $code = $this->generateCode();

        $challenge = OtpChallenge::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'user_type' => $user->user_classification,
            'type' => $type,
            'code_hash' => $this->hashCode($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        $this->dispatchCode($user, $code, $type);

        return $challenge;
    }

    /**
     * OTP for guest (no-account) voters, keyed by phone rather than a user id. This code
     * precedes an M-Pesa STK push to a phone number, so — unlike account login/registration —
     * the phone channel is not optional here: if the SMS gateway can't even accept the
     * message, the same number is unlikely to survive the M-Pesa charge either, so this
     * throws (uncaught) rather than silently falling back to email-only. Email, when given,
     * is still just a backup channel and its failure never blocks the challenge.
     */
    public function issueGuestChallenge(string $phone, ?string $email = null): OtpChallenge
    {
        $code = $this->generateCode();

        $this->sms->send($phone, $this->smsText($code));

        $challenge = OtpChallenge::create([
            'id' => (string) Str::uuid(),
            'user_id' => null,
            'phone' => $phone,
            'email' => $email,
            'user_type' => 'citizen',
            'type' => 'phone_verification',
            'code_hash' => $this->hashCode($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        if ($email) {
            $this->trySend(fn () => Mail::to($email)->send(new OtpCodeMail(
                code: $code,
                subjectLine: 'Your FansBench voting code',
                heading: 'Confirm your vote',
                intro: "Enter this code to verify your vote — it's how we keep every vote on FansBench honest and bot-free.",
                expiresMinutes: self::TTL_MINUTES,
            )));
        }

        return $challenge;
    }

    public function resend(OtpChallenge $challenge): OtpChallenge
    {
        $code = $this->generateCode();

        $challenge->update([
            'code_hash' => $this->hashCode($code),
            'verified_at' => null,
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        // Guest resends are phone-anchored the same way the original challenge was.
        if (! $challenge->user_id && $challenge->phone) {
            $this->sms->send($challenge->phone, $this->smsText($code));
            if ($challenge->email) {
                $this->trySend(fn () => Mail::to($challenge->email)->send(new OtpCodeMail(
                    code: $code,
                    subjectLine: 'Your FansBench voting code',
                    heading: 'Confirm your vote',
                    intro: "Enter this code to verify your vote — it's how we keep every vote on FansBench honest and bot-free.",
                    expiresMinutes: self::TTL_MINUTES,
                )));
            }
        } else {
            $this->dispatchCode($challenge->user, $code, $challenge->type);
        }

        return $challenge->fresh();
    }

    public function verify(OtpChallenge $challenge, string $code): bool
    {
        if (! hash_equals($challenge->code_hash, $this->hashCode($code))) {
            $challenge->increment('attempts');

            return false;
        }

        $challenge->forceFill(['verified_at' => now()])->save();

        return true;
    }

    /**
     * Same code is sent to both channels so the user only ever enters one OTP. Account
     * registration/login isn't M-Pesa-gated at this point, so either channel getting through
     * is enough — a transient email outage shouldn't lock someone out who could otherwise
     * receive the code by SMS (or vice versa). Only fails if neither channel could be reached.
     */
    private function dispatchCode(User $user, string $code, string $type): void
    {
        [$heading, $intro] = match ($type) {
            'registration' => [
                'Welcome to FansBench, '.($user->first_name ?: 'there').'! 👋',
                "You're almost in — enter this code to verify your email and phone, then start backing your favourites with verified votes.",
            ],
            'login' => [
                'Confirm it\'s you',
                'Enter this code to finish signing in to your FansBench account.',
            ],
            default => [
                'Your FansBench verification code',
                'Enter this code to continue.',
            ],
        };

        $emailSent = $this->trySend(fn () => Mail::to($user->email)->send(new OtpCodeMail(
            code: $code,
            subjectLine: $type === 'registration' ? 'Welcome to FansBench — verify your account' : 'Your FansBench verification code',
            heading: $heading,
            intro: $intro,
            expiresMinutes: self::TTL_MINUTES,
        )));

        $smsSent = false;
        if ($user->phone) {
            $smsSent = $this->trySend(fn () => SendSmsJob::dispatch($user->phone, $this->smsText($code)));
        }

        if (! $emailSent && ! $smsSent) {
            throw new RuntimeException('We could not send a verification code by email or SMS. Please try again shortly.');
        }
    }

    /** Runs a single delivery attempt; failures are logged and swallowed rather than fatal. */
    private function trySend(Closure $send): bool
    {
        try {
            $send();

            return true;
        } catch (Throwable $e) {
            Log::error('OTP channel dispatch failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    }

    /**
     * The trailing blank line + "@domain #code" is the WebOTP API's required format
     * (https://wicg.github.io/web-otp/) — Chrome/Android (and Safari/iOS via the same
     * convention) watch for an SMS matching the PAGE'S OWN origin and, when one arrives,
     * let the browser fill the code in automatically without the user ever leaving the tab
     * to open Messages. The domain must exactly match app.url's host or the browser won't
     * associate the SMS with this site at all.
     */
    private function smsText(string $code): string
    {
        $domain = parse_url(config('app.url'), PHP_URL_HOST) ?: 'fansbench.com';

        return "FansBench: your verification code is {$code}. It expires in ".self::TTL_MINUTES." minutes. Never share this code.\n\n@{$domain} #{$code}";
    }

    private function hashCode(string $code): string
    {
        return hash('sha256', $code);
    }
}
