<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsCredential extends Model
{
    protected $fillable = ['label', 'partner_id', 'api_key', 'shortcode', 'is_active'];

    protected $hidden = ['api_key'];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'is_active' => 'boolean',
        ];
    }

    /** The single credential set the system should send SMS with, if any. */
    public static function active(): ?self
    {
        return static::where('is_active', true)->first();
    }
}
