<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Guest (no-account) voters verify a phone via OTP before casting, so a challenge can
     * exist without a user — keyed by phone instead. Reuses the existing type/user_type
     * enum values to avoid an enum ALTER.
     */
    public function up(): void
    {
        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->string('phone')->nullable()->after('user_id');
            $table->index('phone');
        });
    }

    public function down(): void
    {
        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->dropIndex(['phone']);
            $table->dropColumn('phone');
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
