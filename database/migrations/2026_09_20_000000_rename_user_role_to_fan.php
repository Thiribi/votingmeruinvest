<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "user" was always the fan-facing role value (user_classification=citizen is the
     * separate account-type field) — renamed to "fan" so it reads correctly wherever role is
     * displayed. Widen-migrate-narrow so no row is ever caught between the old and new enum.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user','fan','admin','moderator','organizer') NOT NULL DEFAULT 'fan'");
        DB::table('users')->where('role', 'user')->update(['role' => 'fan']);
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('fan','admin','moderator','organizer') NOT NULL DEFAULT 'fan'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('fan','user','admin','moderator','organizer') NOT NULL DEFAULT 'user'");
        DB::table('users')->where('role', 'fan')->update(['role' => 'user']);
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','moderator','organizer') NOT NULL DEFAULT 'user'");
    }
};
