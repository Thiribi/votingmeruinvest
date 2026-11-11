<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subcounty extends Model
{
    protected $fillable = ['county_id', 'name'];

    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }
}
