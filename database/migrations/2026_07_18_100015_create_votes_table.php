<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_option_id')->constrained()->cascadeOnDelete();
            // Set for authenticated citizen votes (public flow).
            $table->foreignId('voter_user_id')->nullable()->constrained('users')->nullOnDelete();
            // Set for single-use invite-link votes (internal campaign voters).
            $table->foreignId('campaign_access_token_id')->nullable()->constrained()->nullOnDelete();
            // Denormalized snapshot of the ranking cycle this vote counted toward; null for private org campaigns.
            $table->foreignId('ranking_period_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('vote_status', ['pending_payment', 'verified', 'rejected', 'flagged'])->default('pending_payment');
            $table->string('mpesa_reference')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            // "One verified person, one vote" per campaign (covers private/org campaigns).
            $table->unique(['campaign_id', 'voter_user_id']);
            // The literal business rule: one vote per category per ranking cycle, regardless of which live
            // public campaign row it came through. NULL ranking_period_id (private campaigns) never collides.
            $table->unique(['ranking_period_id', 'voter_user_id']);
            // A single-use invite token can back exactly one vote.
            $table->unique('campaign_access_token_id');

            $table->index('vote_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes');
    }
};
