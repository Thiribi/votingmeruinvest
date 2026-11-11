<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = [
            [
                'name' => 'Safaricom PLC',
                'industry' => 'Telecommunications',
                'website' => 'https://www.safaricom.co.ke',
                'verified' => true,
                'contact_name' => 'Wanjiku Kamau',
                'contact_role' => 'Brand Manager',
                'contact_email' => 'brand@safaricom.co.ke',
                'contact_phone' => '+254722000001',
            ],
            [
                'name' => 'Kenya Breweries Limited',
                'industry' => 'Beverages',
                'website' => 'https://www.kbl.co.ke',
                'verified' => true,
                'contact_name' => 'James Odhiambo',
                'contact_role' => 'Marketing Lead',
                'contact_email' => 'marketing@kbl.co.ke',
                'contact_phone' => '+254722000002',
            ],
            [
                'name' => 'Nation Media Group',
                'industry' => 'Media',
                'website' => 'https://www.nationmedia.com',
                'verified' => true,
                'contact_name' => 'Susan Achieng',
                'contact_role' => 'Digital Editor',
                'contact_email' => 'digital@nationmedia.com',
                'contact_phone' => '+254722000003',
            ],
            [
                'name' => 'Equity Bank Kenya',
                'industry' => 'Banking',
                'website' => 'https://www.equitybank.co.ke',
                'verified' => false,
                'contact_name' => 'Peter Kiprotich',
                'contact_role' => 'Partnerships Manager',
                'contact_email' => 'partnerships@equitybank.co.ke',
                'contact_phone' => '+254722000004',
            ],
            [
                'name' => 'Nairobi Fashion Week',
                'industry' => 'Events',
                'website' => 'https://www.nairobifashionweek.com',
                'verified' => false,
                'contact_name' => 'Lucy Wambui',
                'contact_role' => 'Events Director',
                'contact_email' => 'info@nairobifashionweek.com',
                'contact_phone' => '+254722000005',
            ],
        ];

        foreach ($organizations as $organization) {
            Organization::firstOrCreate(
                ['slug' => Str::slug($organization['name'])],
                [
                    ...$organization,
                    'slug' => Str::slug($organization['name']),
                    'status' => 'active',
                    'description' => "{$organization['name']} runs verified fan campaigns on FansBench.",
                ]
            );
        }
    }
}
