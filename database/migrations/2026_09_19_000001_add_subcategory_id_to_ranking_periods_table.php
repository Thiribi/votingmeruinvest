<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ranking_periods', function (Blueprint $table) {
            // Seasons are subcategory-scoped (see Subcategory::season_starts_at/ends_at);
            // category_id is kept alongside it (set to the subcategory's parent) so the
            // pre-existing category-level relations/queries keep working untouched.
            // nullOnDelete rather than cascade: a deleted subcategory shouldn't erase the
            // historical seasons its past votes are still keyed to.
            $table->foreignId('subcategory_id')->nullable()->after('category_id')
                ->constrained()->nullOnDelete();

            // Same "at most one active row per scope" trick as active_category_id below,
            // but scoped to the subcategory instead — a subcategory's season and a
            // category-level period (subcategory_id null) are independent, so both unique
            // indexes can coexist without colliding on the same active row.
            $table->unsignedBigInteger('active_subcategory_id')
                ->nullable()
                ->virtualAs("case when `status` = 'active' then `subcategory_id` else null end");
            $table->unique('active_subcategory_id', 'ranking_periods_one_active_per_subcategory');
        });
    }

    public function down(): void
    {
        Schema::table('ranking_periods', function (Blueprint $table) {
            $table->dropUnique('ranking_periods_one_active_per_subcategory');
            $table->dropColumn('active_subcategory_id');
            $table->dropConstrainedForeignId('subcategory_id');
        });
    }
};
