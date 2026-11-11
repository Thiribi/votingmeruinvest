<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->string('partner_id');
            $table->text('api_key'); // encrypted at rest, see SmsCredential::casts()
            $table->string('shortcode');
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_credentials');
    }
};
