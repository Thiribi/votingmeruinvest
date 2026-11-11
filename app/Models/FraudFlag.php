<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraudFlag extends Model
{
    protected $fillable = [
        'campaign_id',
        'vote_id',
        'reason',
        'risk',
        'status',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function vote(): BelongsTo
    {
        return $this->belongsTo(Vote::class);
    }

    public function code(): string
    {
        return sprintf('F-%04d', $this->id);
    }
}
