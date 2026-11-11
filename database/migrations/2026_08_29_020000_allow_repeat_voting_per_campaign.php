<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fans can now cast (and pay to verify) as many votes as they like in the same campaign —
     * drops the "one vote per phone per campaign" and "one vote per account per campaign"
     * unique constraints. The ranking-period-wide unique index and the one-vote-per-invite-token
     * index are untouched — those are separate rules (mutual exclusivity across sibling
     * campaigns in a cycle, and single-use invite links) that weren't part of this change.
     *
     * `votes_campaign_id_voter_user_id_unique` was quietly doing double duty as the supporting
     * index for *two* foreign keys — voter_user_id, and campaign_id itself (as its leftmost
     * prefix) — so MariaDB refuses to drop it until both columns have their own plain index to
     * fall back on, and voter_user_id's FK has to be dropped and recreated around the change
     * (MariaDB pins a FK to the index that backed it at creation time and won't re-target it
     * automatically, even once an equivalent index exists).
     */
    public function up(): void
    {
        $existing = collect(Schema::getIndexes('votes'))->pluck('name');

        if ($existing->contains('votes_campaign_id_voter_phone_unique')) {
            Schema::table('votes', fn (Blueprint $table) => $table->dropUnique(['campaign_id', 'voter_phone']));
        }

        if (! $existing->contains('votes_campaign_id_voter_user_id_unique')) {
            return;
        }

        if (! $existing->contains('votes_campaign_id_index')) {
            Schema::table('votes', fn (Blueprint $table) => $table->index('campaign_id'));
        }
        if (! $existing->contains('votes_voter_user_id_index')) {
            Schema::table('votes', fn (Blueprint $table) => $table->index('voter_user_id'));
        }

        $voterUserIdForeignKeys = collect(DB::select("
            SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'votes' AND COLUMN_NAME = 'voter_user_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        "))->pluck('CONSTRAINT_NAME');

        foreach ($voterUserIdForeignKeys as $name) {
            Schema::table('votes', fn (Blueprint $table) => $table->dropForeign($name));
        }

        Schema::table('votes', fn (Blueprint $table) => $table->dropUnique(['campaign_id', 'voter_user_id']));

        Schema::table('votes', function (Blueprint $table) {
            $table->foreign('voter_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        $foreignKeys = collect(DB::select("
            SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'votes' AND COLUMN_NAME = 'voter_user_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        "))->pluck('CONSTRAINT_NAME');

        foreach ($foreignKeys as $name) {
            Schema::table('votes', fn (Blueprint $table) => $table->dropForeign($name));
        }

        Schema::table('votes', function (Blueprint $table) {
            $table->unique(['campaign_id', 'voter_phone']);
            $table->unique(['campaign_id', 'voter_user_id']);
        });

        Schema::table('votes', function (Blueprint $table) {
            $table->foreign('voter_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }
};
