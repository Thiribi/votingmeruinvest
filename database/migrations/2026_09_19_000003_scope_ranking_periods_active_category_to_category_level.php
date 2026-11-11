<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * active_category_id (added before subcategories had their own seasons) collapsed to
     * category_id for *any* active row, so once a category's subcategories started getting
     * their own active RankingPeriod rows, two subcategories under the same category could
     * never both be "active" at once — the second insert blew up on this index. Redefined to
     * only collapse for genuinely category-wide rows (subcategory_id null); active_subcategory_id
     * already independently enforces "one active season per subcategory".
     */
    public function up(): void
    {
        Schema::table('ranking_periods', function (Blueprint $table) {
            $table->dropUnique('ranking_periods_one_active_per_category');
            $table->dropColumn('active_category_id');
        });

        Schema::table('ranking_periods', function (Blueprint $table) {
            $table->unsignedBigInteger('active_category_id')
                ->nullable()
                ->virtualAs("case when `status` = 'active' and `subcategory_id` is null then `category_id` else null end");
            $table->unique('active_category_id', 'ranking_periods_one_active_per_category');
        });
    }

    public function down(): void
    {
        Schema::table('ranking_periods', function (Blueprint $table) {
            $table->dropUnique('ranking_periods_one_active_per_category');
            $table->dropColumn('active_category_id');
        });

        Schema::table('ranking_periods', function (Blueprint $table) {
            $table->unsignedBigInteger('active_category_id')
                ->nullable()
                ->virtualAs("case when `status` = 'active' then `category_id` else null end");
            $table->unique('active_category_id', 'ranking_periods_one_active_per_category');
        });
    }
};
