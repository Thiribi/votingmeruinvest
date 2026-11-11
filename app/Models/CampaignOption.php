<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignOption extends Model
{
    protected $fillable = ['campaign_id', 'nominee_id', 'label', 'description', 'votes_count'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function nominee(): BelongsTo
    {
        return $this->belongsTo(Nominee::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
