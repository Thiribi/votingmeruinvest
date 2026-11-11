<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    protected $fillable = [
        'organization_id',
        'category_id',
        'category_label',
        'ranking_period_id',
        'created_by_user_id',
        'title',
        'visibility',
        'status',
        'starts_at',
        'closes_at',
        'feedback_options',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'closes_at' => 'datetime',
            'feedback_options' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function rankingPeriod(): BelongsTo
    {
        return $this->belongsTo(RankingPeriod::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(CampaignOption::class);
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(CampaignAccessToken::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    public function isPrivate(): bool
    {
        return $this->visibility === 'private';
    }
}
