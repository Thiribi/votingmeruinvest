<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // The STK push is now dispatched via a queued job, so the transaction row is
        // created before Safaricom has responded with a CheckoutRequestID.
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('checkout_request_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('checkout_request_id')->nullable(false)->change();
        });
    }
};
