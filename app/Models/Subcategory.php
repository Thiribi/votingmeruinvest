<?php

namespace App\Models;

use App\Models\Concerns\Archivable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Subcategory extends Model
{
    use Archivable;

    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 'image_url', 'is_active',
        'season_starts_at', 'season_ends_at', 'is_recurring', 'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'season_starts_at' => 'datetime',
            'season_ends_at' => 'datetime',
            'is_recurring' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function nominees(): HasMany
    {
        return $this->hasMany(Nominee::class);
    }

    public function rankingPeriods(): HasMany
    {
        return $this->hasMany(RankingPeriod::class);
    }

    /** The subcategory's current voting season, if seasons are configured for it (see SeasonService). */
    public function activeRankingPeriod(): HasOne
    {
        return $this->hasOne(RankingPeriod::class)->where('status', 'active');
    }

    public function hasSeasons(): bool
    {
        return $this->season_starts_at !== null && $this->season_ends_at !== null;
    }
}
