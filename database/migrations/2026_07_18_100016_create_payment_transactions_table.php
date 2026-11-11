<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vote_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('mpesa');
            // Safaricom's CheckoutRequestID - what we correlate the async STK callback back to.
            $table->string('checkout_request_id')->unique();
            $table->string('merchant_request_id')->nullable();
            // Safaricom's Mpesa receipt number, present only once the callback confirms success.
            $table->string('provider_reference')->nullable();
            $table->string('phone_number');
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['pending', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->json('raw_callback_payload')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
