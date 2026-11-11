<?php

namespace App\Jobs;

use App\Models\Cart;
use App\Models\PaymentTransaction;
use App\Models\Vote;
use App\Services\MpesaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessCartMpesaPaymentJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public readonly int $transactionId,
        public readonly int $cartId,
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
            "CART-{$this->cartId}",
        );

        $transaction->update([
            'checkout_request_id' => $result['CheckoutRequestID'] ?? null,
            'merchant_request_id' => $result['MerchantRequestID'] ?? null,
        ]);
    }

    /**
     * All retries exhausted — mirrors the original synchronous catch block: drop the
     * batch's votes and reopen the cart so the citizen can retry checkout from scratch.
     */
    public function failed(Throwable $exception): void
    {
        PaymentTransaction::where('id', $this->transactionId)->update(['status' => 'failed']);

        Vote::where('payment_transaction_id', $this->transactionId)->delete();

        Cart::where('id', $this->cartId)->update(['status' => 'open']);

        Log::error('Cart M-Pesa STK push permanently failed', [
            'transaction_id' => $this->transactionId,
            'cart_id' => $this->cartId,
            'error' => $exception->getMessage(),
        ]);
    }
}
