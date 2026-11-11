<?php

namespace App\Services;

use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MpesaService
{
    /**
     * Daraja OAuth token, cached for the lifetime Safaricom grants it (minus a safety margin) so we don't
     * hit /oauth/v1/generate on every request.
     */
    public function getAccessToken(): string
    {
        return Cache::remember('mpesa:access_token', 3000, function (): string {
            $response = Http::withBasicAuth(config('mpesa.consumer_key'), config('mpesa.consumer_secret'))
                ->get(config('mpesa.base_url').'/oauth/v1/generate', ['grant_type' => 'client_credentials']);

            if ($response->failed()) {
                Log::error('Mpesa OAuth token request failed', ['status' => $response->status(), 'body' => $response->body()]);
                throw new RuntimeException('Unable to authenticate with M-Pesa.');
            }

            return $response->json('access_token');
        });
    }

    /**
     * Initiate an STK push and return Safaricom's immediate response (CheckoutRequestID etc.).
     * The actual payment confirmation arrives later, asynchronously, via the callback webhook.
     */
    public function stkPush(string $phone, float $amount, string $accountReference, ?string $transactionDesc = null): array
    {
        $shortcode = config('mpesa.shortcode');
        $timestamp = now()->format('YmdHis');
        $password = base64_encode($shortcode.config('mpesa.passkey').$timestamp);

        $callback = rtrim(config('app.url'), '/');

        $callbackurl = $callback . '/api/webhooks/mpesa/' . config('mpesa.callback_secret');

        $response = Http::withToken($this->getAccessToken())
            ->post(config('mpesa.base_url').'/mpesa/stkpush/v1/processrequest', [
                'BusinessShortCode' => $shortcode,
                'Password' => $password,
                'Timestamp' => $timestamp,
                'TransactionType' => config('mpesa.transaction_type'),
                'Amount' => (int) ceil($amount),
                'PartyA' => $this->normalizeMsisdn($phone),
                'PartyB' => config('mpesa.party_b'),
                'PhoneNumber' => $this->normalizeMsisdn($phone),
                'CallBackURL' => $callbackurl,
                'AccountReference' => $accountReference,
                'TransactionDesc' => $transactionDesc ?? config('mpesa.transaction_desc'),
            ]);

        if ($response->failed()) {
            Log::error('Mpesa STK push failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new RuntimeException('Unable to initiate M-Pesa STK push.');
        }

        $data = $response->json();

        if (($data['ResponseCode'] ?? null) !== '0') {
            throw new RuntimeException($data['ResponseDescription'] ?? 'M-Pesa rejected the STK push request.');
        }

        return $data;
    }

    /** Daraja does not sign callbacks, so authenticity relies on the secret path segment matching. */
    public function verifyCallbackSecret(string $secret): bool
    {
        return hash_equals((string) config('mpesa.callback_secret'), $secret);
    }

    /**
     * Normalize the nested Safaricom callback body into a flat, predictable shape.
     * Returns null CheckoutRequestID etc. untouched if the payload doesn't match the expected structure.
     */
    public function parseCallback(array $payload): array
    {
        $stkCallback = $payload['Body']['stkCallback'] ?? [];
        $resultCode = $stkCallback['ResultCode'] ?? null;
        $metadata = [];

        foreach ($stkCallback['CallbackMetadata']['Item'] ?? [] as $item) {
            if (isset($item['Name'])) {
                $metadata[$item['Name']] = $item['Value'] ?? null;
            }
        }

        return [
            'merchant_request_id' => $stkCallback['MerchantRequestID'] ?? null,
            'checkout_request_id' => $stkCallback['CheckoutRequestID'] ?? null,
            'result_code' => $resultCode,
            'result_desc' => $stkCallback['ResultDesc'] ?? null,
            'successful' => $resultCode === 0,
            'amount' => $metadata['Amount'] ?? null,
            'mpesa_receipt_number' => $metadata['MpesaReceiptNumber'] ?? null,
            'transaction_date' => $metadata['TransactionDate'] ?? null,
            'phone_number' => $metadata['PhoneNumber'] ?? null,
        ];
    }

    private function normalizeMsisdn(string $phone): string
    {
        return ltrim(PhoneNumber::normalize($phone), '+');
    }
}
