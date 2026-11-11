<?php

namespace App\Http\Resources\Concerns;

use App\Models\User;

/**
 * Community feed/conversation posts and replies show the real author's name — except when
 * that author is a platform admin, who should read as "FansBench Team" rather than exposing
 * a staff member's personal name on public-facing content.
 */
trait HidesAdminIdentity
{
    private function displayName(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        return $user->role === 'admin' ? 'FansBench Team' : $user->name;
    }
}
