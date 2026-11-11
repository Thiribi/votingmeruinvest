<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('votes', function (Blueprint $table) {
            // Many votes can now settle against one batch payment (cart checkout),
            // replacing the old 1:1 payment_transactions.vote_id relationship.
            $table->foreignId('payment_transaction_id')->nullable()->after('campaign_access_token_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('votes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_transaction_id');
        });
    }
};
