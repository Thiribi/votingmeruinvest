<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Campaigns can offer preset feedback prompts; voters optionally leave a preset or custom
     * comment after voting. The comment lives on the vote, which already carries the voter's
     * county/location — so feedback is inherently geo-tagged.
     */
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->json('feedback_options')->nullable()->after('closes_at');
        });

        Schema::table('votes', function (Blueprint $table) {
            $table->text('feedback')->nullable()->after('voter_phone');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('feedback_options');
        });

        Schema::table('votes', function (Blueprint $table) {
            $table->dropColumn('feedback');
        });
    }
};
