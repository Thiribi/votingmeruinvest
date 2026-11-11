<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use Illuminate\Database\Seeder;

class PlatformSettingSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PlatformSetting::defaults() as $key => $value) {
            PlatformSetting::firstOrCreate(['key' => $key], ['value' => $value ?? '']);
        }
    }
}
