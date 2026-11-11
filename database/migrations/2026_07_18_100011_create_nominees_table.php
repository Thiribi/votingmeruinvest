<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nominees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained('subcategories')->nullOnDelete();
            $table->string('name');
            $table->string('tag')->nullable();
            $table->text('bio')->nullable();
            $table->string('avatar_url')->nullable();
            // Denormalized counter for fast leaderboard reads; the source of truth is votes (verified, ranking_period-scoped).
            $table->unsignedBigInteger('votes_count')->default(0);
            $table->timestamps();

            $table->index(['category_id', 'votes_count']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nominees');
    }
};
