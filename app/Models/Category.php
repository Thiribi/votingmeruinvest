<?php

namespace App\Models;

use App\Models\Concerns\Archivable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Category extends Model
{
    use Archivable;

    protected $fillable = ['parent_id', 'name', 'slug', 'description', 'image_url', 'status', 'archived_at'];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(Subcategory::class);
    }

    public function nominees(): HasMany
    {
        return $this->hasMany(Nominee::class);
    }

    public function rankingPeriods(): HasMany
    {
        return $this->hasMany(RankingPeriod::class);
    }

    /**
     * The category-wide season, if any — distinct from a subcategory's own season
     * (see Subcategory::activeRankingPeriod()). Excluding subcategory-scoped rows here
     * matters: CampaignSyncService reads this to stamp the category's public Campaign, and
     * a subcategory's season leaking in here would wrongly gate the whole category's voting
     * by one subcategory's schedule.
     */
    public function activeRankingPeriod(): HasOne
    {
        return $this->hasOne(RankingPeriod::class)->where('status', 'active')->whereNull('subcategory_id');
    }
}
