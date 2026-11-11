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
        Schema::table('otp_challenges', function (Blueprint $table) {
            // Snapshot of users.user_classification at issuance time, for auditing (independent of the
            // user's classification possibly changing later).
            $table->enum('user_type', ['citizen', 'admin', 'internal_voter'])->after('user_id');
            // What the code was issued for. Both channels always receive the same code; this just
            // records the triggering action, not which channel(s) it went to.
            $table->enum('type', [
                'registration',
                'login',
                'email_verification',
                'phone_verification',
                'password_reset',
            ])->default('registration')->after('user_type');

            $table->index(['user_type', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->dropIndex(['user_type', 'type']);
            $table->dropColumn(['user_type', 'type']);
        });
    }
};
