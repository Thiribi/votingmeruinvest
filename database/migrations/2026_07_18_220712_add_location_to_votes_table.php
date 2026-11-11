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
        Schema::table('votes', function (Blueprint $table) {
            $table->foreignId('county_id')->nullable()->after('user_agent')->constrained()->nullOnDelete();
            $table->foreignId('subcounty_id')->nullable()->after('county_id')->constrained()->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->after('subcounty_id')->constrained()->nullOnDelete();
            $table->decimal('latitude', 10, 7)->nullable()->after('ward_id');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('votes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('county_id');
            $table->dropConstrainedForeignId('subcounty_id');
            $table->dropConstrainedForeignId('ward_id');
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
