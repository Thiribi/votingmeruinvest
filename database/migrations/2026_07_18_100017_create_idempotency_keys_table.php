<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            // Nullable and NOT part of the uniqueness scope: internal-voter votes and webhook-driven requests
            // have no authenticated user, and MySQL treats each NULL as distinct, so keying on it would let
            // anonymous requests bypass idempotency entirely. The client-generated key is unique per route on its own.
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('route');
            $table->string('key');
            $table->unsignedSmallInteger('response_status');
            $table->json('response_body')->nullable();
            $table->timestamps();

            $table->unique(['route', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
