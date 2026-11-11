<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subcategories', function (Blueprint $table) {
            // Null on both = no season restriction (existing/legacy subcategories keep
            // today's "vote once, ever" behaviour unchanged).
            $table->dateTime('season_starts_at')->nullable()->after('is_active');
            $table->dateTime('season_ends_at')->nullable()->after('season_starts_at');
            $table->boolean('is_recurring')->default(false)->after('season_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('subcategories', function (Blueprint $table) {
            $table->dropColumn(['season_starts_at', 'season_ends_at', 'is_recurring']);
        });
    }
};
