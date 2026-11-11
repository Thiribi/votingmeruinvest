<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            PlatformSettingSeeder::class,
            CountySeeder::class,
            SubcountySeeder::class,
            WardSeeder::class,
            UserSeeder::class,
            OrganizationSeeder::class,
            CategorySeeder::class,
            CampaignSeeder::class,
            FraudFlagSeeder::class,
            PostSeeder::class,
        ]);
    }
}
