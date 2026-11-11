<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignOption;
use App\Models\Category;
use App\Models\Organization;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Database\Seeder;

class CampaignSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@fansbench.com')->first();
        $citizens = User::where('user_classification', 'citizen')->get();

        $musicCategory = Category::where('slug', 'best-musician')->first();
        $athleteCategory = Category::where('slug', 'best-athlete')->first();

        if ($musicCategory) {
            $campaign = Campaign::firstOrCreate(
                ['title' => 'FansBench Music Awards 2026'],
                [
                    'category_id' => $musicCategory->id,
                    'created_by_user_id' => $admin?->id,
                    'visibility' => 'public',
                    'status' => 'live',
                    'starts_at' => now()->subDays(3),
                    'closes_at' => now()->addDays(27),
                ]
            );

            $this->mirrorNomineesAsOptions($campaign, $musicCategory);
            $this->castSampleVotes($campaign, $citizens);
        }

        if ($athleteCategory) {
            $campaign = Campaign::firstOrCreate(
                ['title' => 'Sports Personality of the Year 2026'],
                [
                    'category_id' => $athleteCategory->id,
                    'created_by_user_id' => $admin?->id,
                    'visibility' => 'public',
                    'status' => 'live',
                    'starts_at' => now()->subDays(1),
                    'closes_at' => now()->addDays(29),
                ]
            );

            $this->mirrorNomineesAsOptions($campaign, $athleteCategory);
        }

        $organization = Organization::where('slug', 'safaricom-plc')->first();

        if ($organization) {
            $privateCampaign = Campaign::firstOrCreate(
                ['title' => 'Safaricom Staff Innovation Award'],
                [
                    'organization_id' => $organization->id,
                    'category_label' => 'Internal Recognition',
                    'created_by_user_id' => $admin?->id,
                    'visibility' => 'private',
                    'status' => 'live',
                    'starts_at' => now()->subDays(2),
                    'closes_at' => now()->addDays(12),
                ]
            );

            foreach (['Best New Product Idea', 'Best Customer Experience Fix', 'Best Community Initiative'] as $label) {
                CampaignOption::firstOrCreate(
                    ['campaign_id' => $privateCampaign->id, 'label' => $label],
                    ['votes_count' => random_int(0, 40)]
                );
            }
        }
    }

    private function mirrorNomineesAsOptions(Campaign $campaign, Category $category): void
    {
        foreach ($category->nominees as $nominee) {
            CampaignOption::firstOrCreate(
                ['campaign_id' => $campaign->id, 'nominee_id' => $nominee->id],
                ['label' => $nominee->name, 'votes_count' => $nominee->votes_count]
            );
        }
    }

    private function castSampleVotes(Campaign $campaign, $citizens): void
    {
        $options = $campaign->options()->get();

        if ($options->isEmpty() || $citizens->isEmpty()) {
            return;
        }

        foreach ($citizens as $citizen) {
            if (Vote::where('campaign_id', $campaign->id)->where('voter_user_id', $citizen->id)->exists()) {
                continue;
            }

            $option = $options->random();

            Vote::create([
                'campaign_id' => $campaign->id,
                'campaign_option_id' => $option->id,
                'voter_user_id' => $citizen->id,
                'vote_status' => 'verified',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'seeder',
            ]);

            $option->increment('votes_count');
        }
    }
}
