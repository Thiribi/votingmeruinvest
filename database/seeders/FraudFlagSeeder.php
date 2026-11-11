<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\FraudFlag;
use App\Models\Vote;
use Illuminate\Database\Seeder;

class FraudFlagSeeder extends Seeder
{
    public function run(): void
    {
        $campaign = Campaign::first();

        if (! $campaign) {
            return;
        }

        $vote = Vote::where('campaign_id', $campaign->id)->first();

        $flags = [
            ['reason' => 'Multiple votes detected from the same IP address in a short window.', 'risk' => 'High', 'status' => 'open'],
            ['reason' => 'Voter phone number flagged by M-Pesa as previously associated with fraud.', 'risk' => 'Medium', 'status' => 'open'],
            ['reason' => 'Unusual voting velocity spike, later confirmed as a legitimate viral moment.', 'risk' => 'Low', 'status' => 'cleared'],
            ['reason' => 'Invite token reused after expiry attempt.', 'risk' => 'Medium', 'status' => 'invalidated'],
        ];

        foreach ($flags as $flag) {
            FraudFlag::firstOrCreate(
                ['campaign_id' => $campaign->id, 'reason' => $flag['reason']],
                [
                    'vote_id' => $vote?->id,
                    'risk' => $flag['risk'],
                    'status' => $flag['status'],
                ]
            );
        }
    }
}
