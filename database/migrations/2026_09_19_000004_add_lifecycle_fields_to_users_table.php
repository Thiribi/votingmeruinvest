<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Blocks login while set; reversible (see UserController::suspend/activate).
            $table->timestamp('suspended_at')->nullable()->after('role');
            // A fan's own "delete my account" request, queued for admin approval.
            $table->timestamp('deletion_requested_at')->nullable()->after('suspended_at');
            // Same reversible "archive instead of delete" convention as Category/Subcategory/
            // Nominee (see Archivable) — set once an admin approves a deletion request.
            $table->timestamp('archived_at')->nullable()->after('deletion_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['suspended_at', 'deletion_requested_at', 'archived_at']);
        });
    }
};
