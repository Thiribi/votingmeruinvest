<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Shared "archive instead of delete" behaviour for admin-managed catalogue models
 * (Category, Subcategory, Nominee). An archived record keeps its row and stays
 * visible in the admin UI, but every public read path scopes it out with
 * ->notArchived(). This is intentionally not Laravel's SoftDeletes: delete()
 * still hard-deletes, and archived_at is a separate, reversible visibility flag.
 */
trait Archivable
{
    public function scopeNotArchived(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->whereNotNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function archive(): bool
    {
        return $this->forceFill(['archived_at' => now()])->save();
    }

    public function unarchive(): bool
    {
        return $this->forceFill(['archived_at' => null])->save();
    }
}
