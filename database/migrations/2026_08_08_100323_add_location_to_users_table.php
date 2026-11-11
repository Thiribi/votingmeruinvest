<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Geo-location is now captured once at login/registration (with the user's permission)
     * rather than on every vote, so it can populate the vote-density map without repeatedly
     * prompting during the voting flow.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('mpesa_phone');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->timestamp('location_captured_at')->nullable()->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'location_captured_at']);
        });
    }
};
