<?php

namespace App\Jobs;

use App\Models\PaymentTransaction;
use App\Models\Vote;
use App\Services\MpesaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessVoteMpesaPaymentJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public readonly int $transactionId,
        public readonly int $voteId,
    ) {}

    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function handle(MpesaService $mpesa): void
    {
        $transaction = PaymentTransaction::findOrFail($this->transactionId);

        $result = $mpesa->stkPush(
            $transaction->phone_number,
            (float) $transaction->amount,
            "VOTE-{$this->voteId}",
        );

        $transaction->update([
            'checkout_request_id' => $result['CheckoutRequestID'] ?? null,
            'merchant_request_id' => $result['MerchantRequestID'] ?? null,
        ]);
    }

    /**
     * All retries exhausted — mirrors the original synchronous catch block: the token is
     * already consumed, so the vote is marked rejected rather than deleted.
     */
    public function failed(Throwable $exception): void
    {
        PaymentTransaction::where('id', $this->transactionId)->update(['status' => 'failed']);

        Vote::where('id', $this->voteId)->update(['vote_status' => 'rejected']);

        Log::error('Vote M-Pesa STK push permanently failed', [
            'transaction_id' => $this->transactionId,
            'vote_id' => $this->voteId,
            'error' => $exception->getMessage(),
        ]);
    }
}
