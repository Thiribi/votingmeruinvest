<?php

namespace App\Services;

use App\Models\SmsCredential;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AdvantaSmsService
{
    /**
     * Sends via whichever SmsCredential an admin has marked active; no-ops (logs) if none is.
     * Throws on a failed send — callers run this through SendSmsJob, whose queue retries
     * depend on transient failures actually surfacing as exceptions rather than being swallowed.
     */
    public function send(string $phone, string $message): void
    {
        $credential = SmsCredential::active();

        if (! $credential) {
            Log::info('No active SMS credential configured; logging message instead.', [
                'phone' => $phone,
                'message' => $message,
            ]);

            return;
        }

        $mobile = ltrim(PhoneNumber::normalize($phone), '+');

        $response = Http::post(rtrim(config('advanta.base_url'), '/').'/api/services/sendsms', [
            'apikey' => $credential->api_key,
            'partnerID' => $credential->partner_id,
            'pass_type' => 'plain',
            'message' => $message,
            'shortcode' => $credential->shortcode,
            'mobile' => $mobile,
        ]);

        $result = $response->json('responses.0') ?? $response->json();

        if ($response->failed() || (int) ($result['response-code'] ?? 0) !== 200) {
            Log::error('Advanta SMS send failed', ['phone' => $mobile, 'body' => $response->body()]);

            throw new RuntimeException('Advanta SMS send failed: '.$response->body());
        }
    }
}
