<?php

namespace App\Console\Commands;

use App\Models\County;
use App\Models\Subcounty;
use App\Models\Ward;
use Illuminate\Console\Command;

class ImportGeography extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'geography:import {path : Path to a CSV file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import sub-counties and wards from a CSV with columns: county_code,county_name,subcounty_name,ward_name';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = $this->argument('path');

        if (! is_readable($path)) {
            $this->error("Cannot read file: {$path}");

            return self::FAILURE;
        }

        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $header = array_map('trim', $header);

        $subcounties = 0;
        $wards = 0;
        $row = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $row++;
            $record = array_combine($header, $data);

            $countyCode = trim($record['county_code'] ?? '');
            $countyName = trim($record['county_name'] ?? '');
            $subcountyName = trim($record['subcounty_name'] ?? '');
            $wardName = trim($record['ward_name'] ?? '');

            if ($countyCode === '') {
                $this->warn("Row {$row}: missing county_code, skipped.");

                continue;
            }

            $county = County::firstOrCreate(['code' => $countyCode], ['name' => $countyName ?: $countyCode]);

            if ($subcountyName === '') {
                continue;
            }

            $subcounty = Subcounty::firstOrCreate([
                'county_id' => $county->id,
                'name' => $subcountyName,
            ]);
            $subcounties++;

            if ($wardName === '') {
                continue;
            }

            Ward::firstOrCreate([
                'subcounty_id' => $subcounty->id,
                'name' => $wardName,
            ]);
            $wards++;
        }

        fclose($handle);

        $this->info("Imported/updated {$subcounties} sub-counties and {$wards} wards.");

        return self::SUCCESS;
    }
}
