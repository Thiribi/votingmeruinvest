<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Guest votes are keyed by the OTP-verified phone instead of a user id. The unique index
     * enforces one guest vote per phone per campaign (NULLs — i.e. account votes — are exempt,
     * which MySQL permits for multiple NULLs).
     */
    public function up(): void
    {
        Schema::table('votes', function (Blueprint $table) {
            $table->string('voter_phone')->nullable()->after('voter_user_id');
            $table->unique(['campaign_id', 'voter_phone']);
        });
    }

    public function down(): void
    {
        Schema::table('votes', function (Blueprint $table) {
            $table->dropUnique(['campaign_id', 'voter_phone']);
            $table->dropColumn('voter_phone');
        });
    }
};
