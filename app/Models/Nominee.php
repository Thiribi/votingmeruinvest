<?php

namespace App\Models;

use App\Models\Concerns\Archivable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Nominee extends Model
{
    use Archivable;

    protected $fillable = ['category_id', 'subcategory_id', 'name', 'tag', 'bio', 'avatar_url', 'votes_count', 'archived_at'];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function campaignOptions(): HasMany
    {
        return $this->hasMany(CampaignOption::class);
    }
}
