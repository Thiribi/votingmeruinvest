<?php

namespace Database\Seeders;

use App\Models\Subcounty;
use App\Models\Ward;
use Illuminate\Database\Seeder;

class WardSeeder extends Seeder
{
    /**
     * Placeholder wards per sub-county. Real ward-level boundaries (~1,450 nationwide) aren't
     * bundled with this project; generating a fixed set here keeps the ward picker functional
     * without presenting unverified names as official data. Replace with authoritative data
     * (e.g. IEBC) when available.
     */
    private const WARDS_PER_SUBCOUNTY = 4;

    public function run(): void
    {
        $now = now();

        Subcounty::select('id', 'name')->chunk(100, function ($subcounties) use ($now) {
            $rows = [];

            foreach ($subcounties as $subcounty) {
                for ($i = 1; $i <= self::WARDS_PER_SUBCOUNTY; $i++) {
                    $rows[] = [
                        'subcounty_id' => $subcounty->id,
                        'name' => "{$subcounty->name} Ward {$i}",
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            Ward::upsert($rows, ['subcounty_id', 'name'], ['updated_at']);
        });
    }
}
