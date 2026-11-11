<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\InviteAdminUserRequest;
use App\Http\Requests\Admin\SetUserPermissionsRequest;
use App\Http\Requests\Admin\SetUserRoleRequest;
use App\Http\Requests\Admin\SetUserRolesRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\PasswordResetService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly PasswordResetService $passwordReset,
    ) {}

    public function index(Request $request)
    {
        $users = User::query()
            ->with(['roles.permissions', 'permissions'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->input('role')))
            // "Fans" and "Users" (staff) are split into separate sidebar pages — a fan is
            // always role=fan; anyone with a moderator/organizer/admin role is staff.
            ->when($request->input('classification') === 'fan', fn ($q) => $q->where('role', 'fan'))
            ->when($request->input('classification') === 'staff', fn ($q) => $q->where('role', '!=', 'fan'))
            // "Report for the archived fans" and the pending-deletion queue both read this
            // same list with a filter — archived accounts are hidden from the normal list
            // by default, same convention as Category/Subcategory/Nominee.
            ->when($request->boolean('archived'), fn ($q) => $q->archived())
            ->unless($request->boolean('archived') || $request->boolean('with_archived'), fn ($q) => $q->notArchived())
            ->when($request->boolean('pending_deletion'), fn ($q) => $q->whereNotNull('deletion_requested_at'))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return UserResource::collection($users);
    }

    /** Blocks sign-in without touching the account otherwise — reversible via activate(). */
    public function suspend(Request $request, User $user)
    {
        $user->forceFill(['suspended_at' => now()])->save();

        AuditLog::record($request->user(), 'user.suspended', "Suspended {$user->name} ({$user->email})", $user);

        return new UserResource($user->fresh());
    }

    public function activate(Request $request, User $user)
    {
        $user->forceFill(['suspended_at' => null])->save();

        AuditLog::record($request->user(), 'user.activated', "Reactivated {$user->name} ({$user->email})", $user);

        return new UserResource($user->fresh());
    }

    /** Admin-triggered "reset this user's password" — emails them a fresh reset link. */
    public function resetPassword(Request $request, User $user)
    {
        $this->passwordReset->sendResetLink($user);

        AuditLog::record($request->user(), 'user.password_reset_sent', "Sent a password reset link to {$user->email}", $user);

        return response()->json(['ok' => true]);
    }

    /**
     * The admin side of a fan's "delete my account" request (see AccountController::
     * requestDeletion) — soft-deletes via the same reversible Archivable convention as the
     * catalogue models, rather than a hard delete, so it can be reviewed/reversed.
     */
    public function archive(Request $request, User $user)
    {
        $user->archive();
        $user->forceFill(['deletion_requested_at' => null])->save();

        AuditLog::record($request->user(), 'user.archived', "Archived {$user->name} ({$user->email})", $user);

        return new UserResource($user->fresh());
    }

    public function unarchive(Request $request, User $user)
    {
        $user->unarchive();

        AuditLog::record($request->user(), 'user.unarchived', "Restored {$user->name} ({$user->email})", $user);

        return new UserResource($user->fresh());
    }

    /** Rejects a pending deletion request without archiving the account. */
    public function dismissDeletionRequest(Request $request, User $user)
    {
        $user->forceFill(['deletion_requested_at' => null])->save();

        AuditLog::record($request->user(), 'user.deletion_request_dismissed', "Dismissed {$user->name}'s deletion request", $user);

        return new UserResource($user->fresh());
    }

    public function update(UpdateAdminUserRequest $request, User $user)
    {
        $data = $request->validated();

        $profile = array_intersect_key($data, array_flip(['first_name', 'last_name', 'email', 'phone']));
        if (isset($profile['first_name']) || isset($profile['last_name'])) {
            $profile['name'] = trim(($profile['first_name'] ?? $user->first_name).' '.($profile['last_name'] ?? $user->last_name));
        }
        if ($profile) {
            $user->update($profile);
        }

        if (isset($data['role'])) {
            $user->update(['role' => $data['role']]);
        }

        if (isset($data['permissions'])) {
            $this->syncPermissions($user, $data['permissions']);
        }

        if ($profile || isset($data['role'])) {
            AuditLog::record($request->user(), 'user.updated', "Updated {$user->name}'s account details", $user);
        }

        return new UserResource($user->fresh());
    }

    public function setRole(SetUserRoleRequest $request, User $user)
    {
        $data = $request->validated();

        $user->update(['role' => $data['role']]);

        AuditLog::record($request->user(), 'user.role_updated', "Set {$user->name}'s role to {$data['role']}", $user);

        return new UserResource($user->fresh());
    }

    public function setPermissions(SetUserPermissionsRequest $request, User $user)
    {
        $data = $request->validated();

        $this->syncPermissions($user, $data['permissions']);

        AuditLog::record($request->user(), 'user.permissions_updated', "Updated {$user->name}'s direct permissions", $user);

        return new UserResource($user->fresh());
    }

    public function setRoles(SetUserRolesRequest $request, User $user)
    {
        $data = $request->validated();

        $ids = Role::whereIn('name', $data['roles'])->pluck('id');

        $user->roles()->sync($ids);

        $roleNames = implode(', ', $data['roles']) ?: 'none';
        AuditLog::record($request->user(), 'user.roles_assigned', "Assigned roles to {$user->name}: {$roleNames}", $user);

        return new UserResource($user->fresh());
    }

    /**
     * Admins can create either a fan (role "fan", classified as a citizen — same as
     * self-registration) or staff (moderator/organizer/admin, classified "admin"). Both get a
     * password-setup email; only the wording and classification differ.
     */
    public function invite(InviteAdminUserRequest $request)
    {
        $data = $request->validated();
        $isFan = $data['role'] === 'fan';

        $user = User::create([
            'name' => trim("{$data['first_name']} {$data['last_name']}"),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'user_classification' => $isFan ? 'citizen' : 'admin',
            'password' => null,
        ]);

        $this->passwordReset->sendWelcomeLink($user, $isFan, ucfirst($data['role']));

        AuditLog::record($request->user(), 'user.invited', "Invited {$user->email} as {$data['role']}", $user);

        return new UserResource($user->fresh());
    }

    public function destroy(Request $request, User $user)
    {
        AuditLog::record($request->user(), 'user.deleted', "Deleted user {$user->name} ({$user->email})");

        $user->delete();

        return response()->json(['ok' => true]);
    }

    private function syncPermissions(User $user, array $names): void
    {
        $ids = collect($names)->map(
            fn ($name) => Permission::firstOrCreate(['name' => $name])->id
        );

        $user->permissions()->sync($ids);
    }
}
