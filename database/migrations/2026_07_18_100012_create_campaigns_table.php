<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            // Exactly one of organization_id (private, org-run) / category_id (public, ranking-cycle-linked) is expected
            // to be set — enforced in the CampaignRequest form request, not at the DB level.
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ranking_period_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->enum('status', ['draft', 'live', 'closed'])->default('draft');
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('closes_at')->nullable();
            $table->timestamps();

            $table->index(['visibility', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
