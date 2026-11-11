<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Nominees already carry avatar_url; categories and subcategories get the same
        // admin-settable image so fans see a picture at every level of the browse UI.
        Schema::table('categories', function (Blueprint $table) {
            $table->string('image_url', 2048)->nullable()->after('description');
        });

        Schema::table('subcategories', function (Blueprint $table) {
            $table->string('image_url', 2048)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });

        Schema::table('subcategories', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });
    }
};
