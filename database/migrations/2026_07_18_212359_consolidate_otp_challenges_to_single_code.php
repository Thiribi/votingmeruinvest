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
            $table->string('code_hash')->after('user_id');
            $table->timestamp('verified_at')->nullable()->after('code_hash');
        });

        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->dropColumn(['email_code_hash', 'message_code_hash', 'email_verified_at', 'message_verified_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->string('email_code_hash')->after('user_id');
            $table->string('message_code_hash')->after('email_code_hash');
            $table->timestamp('email_verified_at')->nullable()->after('message_code_hash');
            $table->timestamp('message_verified_at')->nullable()->after('email_verified_at');
        });

        Schema::table('otp_challenges', function (Blueprint $table) {
            $table->dropColumn(['code_hash', 'verified_at']);
        });
    }
};
