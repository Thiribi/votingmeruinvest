<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Guest voters can optionally give a backup email so the OTP still reaches them if the
     * SMS gateway fails — the code is sent to both channels, same as account-holder OTPs.
     */
    public function up(): void
    {
        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->string('email')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
