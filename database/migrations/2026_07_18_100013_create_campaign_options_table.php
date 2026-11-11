<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            // Set when this option is a public-campaign choice mirroring a category nominee; null for private/org custom options.
            $table->foreignId('nominee_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('votes_count')->default(0);
            $table->timestamps();

            $table->unique(['campaign_id', 'nominee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_options');
    }
};
