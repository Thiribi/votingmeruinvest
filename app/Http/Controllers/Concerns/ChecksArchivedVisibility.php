<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

/**
 * The catalogue listing endpoints (/categories, /nominees, ...) are shared by the public
 * site and the admin console. Archived records must stay hidden from the public but remain
 * visible to admins, so an admin request opts in with ?with_archived=1 and we only honour
 * it when the caller actually holds the relevant manage permission.
 *
 * These routes sit outside the auth:sanctum middleware group, so the user has to be
 * resolved explicitly through the sanctum guard (the bearer token is still on the request).
 */
trait ChecksArchivedVisibility
{
    protected function maySeeArchived(Request $request, string $permission): bool
    {
        if (! $request->boolean('with_archived')) {
            return false;
        }

        $user = $request->user() ?: auth('sanctum')->user();

        return $user && ($user->role === 'admin' || $user->hasPermission($permission));
    }
}
