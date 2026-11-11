<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vote extends Model
{
    protected $fillable = [
        'campaign_id',
        'campaign_option_id',
        'voter_user_id',
        'voter_phone',
        'campaign_access_token_id',
        'payment_transaction_id',
        'ranking_period_id',
        'vote_status',
        'mpesa_reference',
        'feedback',
        'ip_address',
        'user_agent',
        'county_id',
        'subcounty_id',
        'ward_id',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(CampaignOption::class, 'campaign_option_id');
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voter_user_id');
    }

    public function accessToken(): BelongsTo
    {
        return $this->belongsTo(CampaignAccessToken::class, 'campaign_access_token_id');
    }

    public function rankingPeriod(): BelongsTo
    {
        return $this->belongsTo(RankingPeriod::class);
    }

    public function paymentTransaction(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class);
    }

    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    public function subcounty(): BelongsTo
    {
        return $this->belongsTo(Subcounty::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }
}
