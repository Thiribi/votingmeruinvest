<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::withCount('users')->with('permissions')->orderBy('name')->get();

        return RoleResource::collection($roles);
    }

    public function store(StoreRoleRequest $request)
    {
        $data = $request->validated();

        $role = Role::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        $role->permissions()->sync(
            Permission::whereIn('name', $data['permissions'] ?? [])->pluck('id')
        );

        AuditLog::record($request->user(), 'role.created', "Created role \"{$role->name}\"", $role);

        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role)
    {
        $data = $request->validated();

        $role->update([
            'name' => $data['name'] ?? $role->name,
            'description' => $data['description'] ?? $role->description,
        ]);

        if (isset($data['permissions'])) {
            $role->permissions()->sync(
                Permission::whereIn('name', $data['permissions'])->pluck('id')
            );
        }

        AuditLog::record($request->user(), 'role.updated', "Updated role \"{$role->name}\"", $role);

        return new RoleResource($role->load('permissions'));
    }

    public function destroy(Request $request, Role $role)
    {
        AuditLog::record($request->user(), 'role.deleted', "Deleted role \"{$role->name}\"");

        $role->delete();

        return response()->json(['ok' => true]);
    }
}
