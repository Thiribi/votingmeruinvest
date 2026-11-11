<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ranking_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->enum('status', ['draft', 'active', 'closed'])->default('draft');
            $table->timestamps();

            // MySQL-only trick: a virtual column that collapses to category_id only while active, so a unique
            // index on it enforces "at most one active ranking period per category" at the DB level.
            $table->unsignedBigInteger('active_category_id')
                ->nullable()
                ->virtualAs("case when `status` = 'active' then `category_id` else null end");
            $table->unique('active_category_id', 'ranking_periods_one_active_per_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ranking_periods');
    }
};
