<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The raw (ranking_period_id, voter_user_id) unique index was harmless while
     * ranking_period_id was always null (multiple NULLs don't collide). Now that seasons
     * populate it for real, the raw index would wrongly block a retry after a rejected/failed
     * M-Pesa payment — the failed row keeps its ranking_period_id, so a second genuine attempt
     * would hit a duplicate-key error instead of creating a new vote. Replaced with the same
     * "virtual column collapses to null unless X" trick already used for
     * ranking_periods.active_category_id, scoped to vote_status = 'verified' so only a
     * confirmed vote ever counts toward the one-per-season rule.
     */
    public function up(): void
    {
        $existing = collect(Schema::getIndexes('votes'))->pluck('name');

        if (! $existing->contains('votes_ranking_period_id_voter_user_id_unique')) {
            return;
        }

        // Same MariaDB quirk as the campaign_id/voter_user_id change: this unique index is
        // also the only index backing ranking_period_id's foreign key, so a plain index has
        // to exist first and the FK has to be dropped/recreated around the change.
        if (! $existing->contains('votes_ranking_period_id_index')) {
            Schema::table('votes', fn (Blueprint $table) => $table->index('ranking_period_id'));
        }

        $foreignKeys = collect(DB::select("
            SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'votes' AND COLUMN_NAME = 'ranking_period_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        "))->pluck('CONSTRAINT_NAME');

        foreach ($foreignKeys as $name) {
            Schema::table('votes', fn (Blueprint $table) => $table->dropForeign($name));
        }

        Schema::table('votes', fn (Blueprint $table) => $table->dropUnique('votes_ranking_period_id_voter_user_id_unique'));

        Schema::table('votes', function (Blueprint $table) {
            $table->foreign('ranking_period_id')->references('id')->on('ranking_periods')->nullOnDelete();

            $table->unsignedBigInteger('verified_ranking_period_id')
                ->nullable()
                ->virtualAs("case when `vote_status` = 'verified' then `ranking_period_id` else null end");
        });

        Schema::table('votes', function (Blueprint $table) {
            $table->unique(['verified_ranking_period_id', 'voter_user_id'], 'votes_one_verified_per_ranking_period');
        });
    }

    public function down(): void
    {
        Schema::table('votes', function (Blueprint $table) {
            $table->dropUnique('votes_one_verified_per_ranking_period');
            $table->dropColumn('verified_ranking_period_id');
        });

        Schema::table('votes', function (Blueprint $table) {
            $table->unique(['ranking_period_id', 'voter_user_id']);
        });
    }
};
