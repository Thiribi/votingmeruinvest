<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'user_id',
        'provider',
        'checkout_request_id',
        'merchant_request_id',
        'provider_reference',
        'phone_number',
        'amount',
        'status',
        'raw_callback_payload',
    ];

    protected function casts(): array
    {
        return [
            'raw_callback_payload' => 'array',
            'amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
