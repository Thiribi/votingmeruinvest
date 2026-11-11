<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Two related admin-safety changes:
     *
     * 1. Archiving for categories/subcategories/nominees — a nullable `archived_at` stamp so
     *    admins can retire a record without deleting it. Archived rows stay in the database and
     *    the admin UI, but every public read path filters them out. Deliberately a plain column
     *    rather than the SoftDeletes trait: `delete()` still means hard delete here, and archive
     *    is a distinct, reversible "hide from the frontend" state.
     *
     * 2. A third fraud-flag resolution, `cancelled` — the reviewer voids the vote *and* flags
     *    its payment for refund, as opposed to `invalidated` which only rejects the vote.
     */
    public function up(): void
    {
        foreach (['categories', 'subcategories', 'nominees'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->timestamp('archived_at')->nullable()->after('updated_at');
                $t->index('archived_at');
            });
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE fraud_flags MODIFY status ENUM('open', 'cleared', 'invalidated', 'cancelled') NOT NULL DEFAULT 'open'");
        }
        // SQLite (test suite) stores enums as unconstrained TEXT — no schema change needed.
    }

    public function down(): void
    {
        foreach (['categories', 'subcategories', 'nominees'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropIndex(['archived_at']);
                $t->dropColumn('archived_at');
            });
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE fraud_flags SET status = 'invalidated' WHERE status = 'cancelled'");
            DB::statement("ALTER TABLE fraud_flags MODIFY status ENUM('open', 'cleared', 'invalidated') NOT NULL DEFAULT 'open'");
        }
    }
};
