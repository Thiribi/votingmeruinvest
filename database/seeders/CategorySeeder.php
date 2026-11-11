<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Nominee;
use App\Models\Subcategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Best Musician' => [
                'subcategories' => ['Best Male Artist', 'Best Female Artist'],
                'nominees' => [
                    ['name' => 'Bahati', 'tag' => 'Gengetone / Afrobeat'],
                    ['name' => 'Nadia Mukami', 'tag' => 'Afro-pop'],
                    ['name' => 'Sauti Sol', 'tag' => 'Afro-fusion group'],
                    ['name' => 'Nyashinski', 'tag' => 'Hip-hop / Rap'],
                    ['name' => 'Akothee', 'tag' => 'Benga / Afro-pop'],
                ],
            ],
            'Best Content Creator' => [
                'subcategories' => ['Best YouTuber', 'Best TikToker'],
                'nominees' => [
                    ['name' => 'Azziad Nasenya', 'tag' => 'Lifestyle & dance'],
                    ['name' => 'Elsa Majimbo', 'tag' => 'Comedy'],
                    ['name' => 'Kelvin Kinuthia', 'tag' => 'Vlogging'],
                    ['name' => 'Sharon Mundia', 'tag' => 'Fashion & lifestyle'],
                ],
            ],
            'Best Athlete' => [
                'subcategories' => ['Best Footballer', 'Best Track & Field'],
                'nominees' => [
                    ['name' => 'Faith Kipyegon', 'tag' => 'Track & Field'],
                    ['name' => 'Michael Olunga', 'tag' => 'Football'],
                    ['name' => 'Eliud Kipchoge', 'tag' => 'Marathon'],
                    ['name' => 'Beryl Oyoo', 'tag' => 'Rugby Sevens'],
                ],
            ],
            'Best Radio Personality' => [
                'subcategories' => ['Best Radio Host', 'Best Podcast Host'],
                'nominees' => [
                    ['name' => 'Maina Kageni', 'tag' => 'Morning show host'],
                    ['name' => 'Joey Muthengi', 'tag' => 'Radio & TV host'],
                    ['name' => 'Mwalimu Rachel', 'tag' => 'Podcast host'],
                ],
            ],
            'Best Brand Campaign' => [
                'subcategories' => ['Best TV Ad', 'Best Social Campaign'],
                'nominees' => [
                    ['name' => 'Safaricom Twiga Bora', 'tag' => 'TV campaign'],
                    ['name' => 'Tusker #WeMoveTogether', 'tag' => 'Social campaign'],
                    ['name' => 'Equity #Elimu Fund', 'tag' => 'CSR campaign'],
                ],
            ],
        ];

        foreach ($categories as $name => $data) {
            $category = Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'slug' => Str::slug($name),
                    'description' => "Vote for your favourite in {$name}.",
                    'status' => 'live',
                ]
            );

            foreach ($data['subcategories'] as $subName) {
                Subcategory::firstOrCreate(
                    ['category_id' => $category->id, 'slug' => Str::slug($subName)],
                    ['name' => $subName, 'description' => null]
                );
            }

            foreach ($data['nominees'] as $nominee) {
                Nominee::firstOrCreate(
                    ['category_id' => $category->id, 'name' => $nominee['name']],
                    [
                        'tag' => $nominee['tag'],
                        'bio' => "{$nominee['name']} is a fan favourite in {$name}.",
                        'votes_count' => random_int(50, 5000),
                    ]
                );
            }
        }
    }
}
