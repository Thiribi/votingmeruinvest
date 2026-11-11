<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Services\FraudDetectionService;
use App\Services\MpesaService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private readonly MpesaService $mpesa,
        private readonly FraudDetectionService $fraud,
    ) {}

    public function mpesa(Request $request, string $secret)
    {
        if (! $this->mpesa->verifyCallbackSecret($secret)) {
            throw new HttpException(403, 'Invalid callback secret.');
        }

        $callback = $this->mpesa->parseCallback($request->all());

        $transaction = PaymentTransaction::where('checkout_request_id', $callback['checkout_request_id'])->first();

        if (! $transaction) {
            return response()->json(['ok' => true]);
        }

        $transaction->update([
            'status' => $callback['successful'] ? 'completed' : 'failed',
            'provider_reference' => $callback['mpesa_receipt_number'],
            'raw_callback_payload' => $request->all(),
        ]);


        foreach ($transaction->votes as $vote) {
            $vote->update([
                'vote_status' => $callback['successful'] ? 'verified' : 'rejected',
                'mpesa_reference' => $callback['mpesa_receipt_number'],
            ]);

            if ($callback['successful']) {
                $vote->option?->increment('votes_count');
                $vote->option?->nominee?->increment('votes_count');
                $this->fraud->evaluate($vote);
            }
        }

        return response()->json(['ok' => true]);
    }
}
