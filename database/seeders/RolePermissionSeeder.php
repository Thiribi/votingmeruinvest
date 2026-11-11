<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'campaigns.create' => 'Create campaigns',
            'campaigns.publish' => 'Publish campaigns',
            'users.view' => 'View platform users',
            'users.suspend' => 'Suspend platform users',
            'fraud.review' => 'Review fraud flags',
            'fraud.resolve' => 'Clear or invalidate fraud flags',
            'orgs.manage' => 'Manage organizations',
            'settings.edit' => 'Edit platform settings',
            'categories.manage' => 'Create, edit and delete categories',
            'subcategories.manage' => 'Create, edit and delete subcategories',
            'nominees.manage' => 'Create, edit and delete nominees (voting items)',
            'sms.manage' => 'Manage SMS gateway credentials',
            'roles.manage' => 'Create roles and assign them to users',
            'reports.view' => 'Download votes and revenue CSV reports',
        ];

        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(['name' => $name], ['description' => $description]);
        }

        $roles = [
            'moderator' => ['fraud.review', 'fraud.resolve', 'users.view'],
            'organizer' => ['campaigns.create', 'campaigns.publish', 'orgs.manage'],
            'admin' => array_keys($permissions),
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName]);
            $role->permissions()->sync(
                Permission::whereIn('name', $rolePermissions)->pluck('id')
            );
        }
    }
}
