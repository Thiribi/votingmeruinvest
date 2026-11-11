<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        $admin = User::firstOrCreate(
            ['email' => 'melvinthiribi@gmail.com'],
            [
                'name' => 'FansBench Admin',
                'phone' => '+254715731823',
                'password' => Hash::make('password'),
                'user_classification' => 'admin',
                'role' => 'admin',
                'verified_at' => now(),
            ],

            ['email' => 'thuranira.work1@gmail.com'],
            [
                'name' => 'Thuranira Admin',
                'phone' => '+254728159460',
                'password' => Hash::make('password'),
                'user_classification' => 'admin',
                'role' => 'admin',
                'verified_at' => now(),
            ]
        );
        $admin->roles()->sync(Role::where('name', 'admin')->pluck('id'));

        // Moderator
        $moderator = User::firstOrCreate(
            ['email' => 'moderator@fansbench.com'],
            [
                'name' => 'Amina Hassan',
                'phone' => '+254700000001',
                'role' => 'moderator',
                'user_classification' => 'admin',
                'password' => Hash::make('password'),
                'verified_at' => now(),
            ]
        );
        $moderator->roles()->sync(Role::where('name', 'moderator')->pluck('id'));

        // Organizer
        $organizer = User::firstOrCreate(
            ['email' => 'organizer@fansbench.com'],
            [
                'name' => 'David Mwangi',
                'phone' => '+254700000002',
                'role' => 'organizer',
                'password' => Hash::make('password'),
                'verified_at' => now(),
            ]
        );
        $organizer->roles()->sync(Role::where('name', 'organizer')->pluck('id'));

        // Citizens
        $citizens = [
            ['name' => 'Grace Kinuthia', 'email' => 'grace@example.com', 'phone' => '+254711000001'],
            ['name' => 'Brian Owino', 'email' => 'brian@example.com', 'phone' => '+254711000002'],
            ['name' => 'Obadiah Thuranira', 'email' => 'thuranira.obadiah@gmail.com', 'phone' => '+25472815946..'],
            ['name' => 'Kevin Mwingirwa', 'email' => 'kevin@example.com', 'phone' => '+254711000004'],
        ];

        foreach ($citizens as $citizen) {
            User::firstOrCreate(
                ['email' => $citizen['email']],
                [
                    ...$citizen,
                    'password' => Hash::make('password'),
                    'verified_at' => now(),
                ]
            );
        }
    }
}