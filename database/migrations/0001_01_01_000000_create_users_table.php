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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable()->unique();
            $table->string('avatar_url')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            // Set once both OTP channels (and, when required, the M-Pesa fee) clear - drives "verified voter" counts.
            $table->timestamp('verified_at')->nullable();
            // Fundamental account type - governs which auth flow applies (self-register+OTP, dashboard-created+RBAC, or single-use link).
            $table->enum('user_classification', ['citizen', 'admin', 'internal_voter'])->default('citizen');
            // Denormalized display role. Meaningful mainly when user_classification = admin; real authorization lives in roles/permissions tables.
            $table->enum('role', ['user', 'admin', 'moderator', 'organizer'])->default('user');
            $table->string('mpesa_phone')->nullable();
            // Internal campaign voters authenticate via a single-use link, not a password.
            $table->string('password')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index('user_classification');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
    }
};
