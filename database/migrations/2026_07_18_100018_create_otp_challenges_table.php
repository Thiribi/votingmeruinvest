<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_challenges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Codes are hashed at rest; only ever compared, never displayed back.
            $table->string('email_code_hash');
            $table->string('message_code_hash');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('message_verified_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            // Nullable at the DB level (app always sets it on insert) because a NOT NULL
            // timestamp with no default fails table creation outright under strict SQL
            // modes (NO_ZERO_DATE), which MySQL enables by default on Windows/XAMPP.
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_challenges');
    }
};
