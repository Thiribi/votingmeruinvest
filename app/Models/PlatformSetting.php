<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    public static function defaults(): array
    {
        return [
            'platform_name' => 'FansBench',
            'support_email' => 'info@techdeciphers.co.ke',
            'require_dual_otp' => true,
            'mpesa_enabled' => true,
            'mpesa_shortcode' => config('mpesa.shortcode') ?? '',
            'fraud_auto_review' => true,
            'max_votes_per_ip' => 20,
        ];
    }

    /** Defaults merged with whatever's actually been persisted. */
    public static function resolved(): array
    {
        $stored = static::query()->pluck('value', 'key')->all();

        return array_merge(static::defaults(), $stored);
    }
}
