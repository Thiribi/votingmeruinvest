<?php

namespace Database\Seeders;

use App\Models\County;
use App\Models\Subcounty;
use Illuminate\Database\Seeder;

class SubcountySeeder extends Seeder
{
    /** Sub-counties per county (keyed by the county code used in CountySeeder), aligned to Kenya's 290 constituency boundaries. */
    public function run(): void
    {
        $subcounties = [
            '001' => ['Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni', 'Mvita'],
            '002' => ['Msambweni', 'Lunga Lunga', 'Matuga', 'Kinango'],
            '003' => ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'],
            '004' => ['Garsen', 'Galole', 'Bura'],
            '005' => ['Lamu East', 'Lamu West'],
            '006' => ['Taveta', 'Wundanyi', 'Mwatate', 'Voi'],
            '007' => ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara'],
            '008' => ['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South'],
            '009' => ['Mandera West', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera East', 'Lafey'],
            '010' => ['Moyale', 'North Horr', 'Saku', 'Laisamis'],
            '011' => ['Isiolo North', 'Isiolo South'],
            '012' => ['Igembe South', 'Igembe Central', 'Igembe North', 'Tigania West', 'Tigania East', 'North Imenti', 'Buuri', 'Central Imenti', 'South Imenti'],
            '013' => ['Maara', "Chuka/Igambang'ombe", 'Tharaka'],
            '014' => ['Manyatta', 'Runyenjes', 'Mbeere South', 'Mbeere North'],
            '015' => ['Mwingi North', 'Mwingi West', 'Mwingi Central', 'Kitui West', 'Kitui Rural', 'Kitui Central', 'Kitui East', 'Kitui South'],
            '016' => ['Masinga', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Mavoko', 'Machakos Town', 'Mwala'],
            '017' => ['Mbooni', 'Kilome', 'Kaiti', 'Makueni', 'Kibwezi West', 'Kibwezi East'],
            '018' => ['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Jorok', 'Ndaragwa'],
            '019' => ['Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurweini', 'Nyeri Town'],
            '020' => ['Mwea', 'Gichugu', 'Ndia', 'Kirinyaga Central'],
            '021' => ['Kangema', 'Mathioya', 'Kiharu', 'Kigumo', 'Maragwa', 'Kandara', 'Gatanga'],
            '022' => ['Gatundu South', 'Gatundu North', 'Juja', 'Thika Town', 'Ruiru', 'Githunguri', 'Kiambu', 'Kiambaa', 'Kabete', 'Kikuyu', 'Limuru', 'Lari'],
            '023' => ['Turkana North', 'Turkana West', 'Turkana Central', 'Loima', 'Turkana South', 'Turkana East'],
            '024' => ['Kapenguria', 'Sigor', 'Kacheliba', 'Pokot South'],
            '025' => ['Samburu West', 'Samburu North', 'Samburu East'],
            '026' => ['Kwanza', 'Endebess', 'Saboti', 'Kiminini', 'Cherangany'],
            '027' => ['Soy', 'Turbo', 'Moiben', 'Ainabkoi', 'Kapseret', 'Kesses'],
            '028' => ['Marakwet East', 'Marakwet West', 'Keiyo North', 'Keiyo South'],
            '029' => ['Tinderet', 'Aldai', 'Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop'],
            '030' => ['Tiaty', 'Baringo North', 'Baringo Central', 'Baringo South', 'Mogotio', 'Eldama Ravine'],
            '031' => ['Laikipia West', 'Laikipia East', 'Laikipia North'],
            '032' => ['Molo', 'Njoro', 'Naivasha', 'Gilgil', 'Kuresoi South', 'Kuresoi North', 'Subukia', 'Rongai', 'Bahati', 'Nakuru Town West', 'Nakuru Town East'],
            '033' => ['Kilgoris', 'Emurua Dikirr', 'Narok North', 'Narok East', 'Narok South', 'Narok West'],
            '034' => ['Kajiado North', 'Kajiado Central', 'Kajiado East', 'Kajiado West', 'Kajiado South'],
            '035' => ['Kipkelion East', 'Kipkelion West', 'Ainamoi', 'Bureti', 'Belgut', 'Sigowet/Soin'],
            '036' => ['Sotik', 'Chepalungu', 'Bomet East', 'Bomet Central', 'Konoin'],
            '037' => ['Lugari', 'Likuyani', 'Malava', 'Lurambi', 'Navakholo', 'Mumias West', 'Mumias East', 'Matungu', 'Butere', 'Khwisero', 'Shinyalu', 'Ikolomani'],
            '038' => ['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya'],
            '039' => ['Mt Elgon', 'Sirisia', 'Kabuchai', 'Bumula', 'Kanduyi', 'Webuye East', 'Webuye West', 'Kimilili', 'Tongaren'],
            '040' => ['Teso North', 'Teso South', 'Nambale', 'Matayos', 'Butula', 'Funyula', 'Budalangi'],
            '041' => ['Ugenya', 'Ugunja', 'Alego Usonga', 'Gem', 'Bondo', 'Rarieda'],
            '042' => ['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Seme', 'Nyando', 'Muhoroni', 'Nyakach'],
            '043' => ['Kasipul', 'Kabondo Kasipul', 'Homa Bay Town', 'Ndhiwa', 'Rangwe', 'Suba North', 'Suba South'],
            '044' => ['Rongo', 'Awendo', 'Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Kuria West', 'Kuria East'],
            '045' => ['Bonchari', 'South Mugirango', 'Bomachoge Borabu', 'Bobasi', 'Bomachoge Chache', 'Nyaribari Masaba', 'Nyaribari Chache', 'Kitutu Chache North', 'Kitutu Chache South'],
            '046' => ['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu'],
            '047' => ['Westlands', 'Dagoretti North', 'Dagoretti South', 'Langata', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi South', 'Embakasi North', 'Embakasi Central', 'Embakasi East', 'Embakasi West', 'Makadara', 'Kamukunji', 'Starehe', 'Mathare'],
        ];

        $countyIds = County::pluck('id', 'code');
        $now = now();
        $rows = [];

        foreach ($subcounties as $code => $names) {
            $countyId = $countyIds[$code] ?? null;

            if (! $countyId) {
                continue;
            }

            foreach ($names as $name) {
                $rows[] = [
                    'county_id' => $countyId,
                    'name' => $name,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        Subcounty::upsert($rows, ['county_id', 'name'], ['updated_at']);
    }
}
