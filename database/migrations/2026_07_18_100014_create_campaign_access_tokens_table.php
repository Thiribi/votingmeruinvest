<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            // Only the SHA-256 hash is stored; the plaintext token is emailed once and never persisted.
            $table->string('token_hash')->unique();
            $table->timestamp('used_at')->nullable();
            // Nullable at the DB level (app always sets it on insert) because a NOT NULL
            // timestamp with no default fails table creation outright under strict SQL
            // modes (NO_ZERO_DATE), which MySQL enables by default on Windows/XAMPP.
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_access_tokens');
    }
};
