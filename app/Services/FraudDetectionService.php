<?php

namespace App\Services;

use App\Models\FraudFlag;
use App\Models\PlatformSetting;
use App\Models\Vote;

/**
 * Runs lightweight heuristics against a just-verified vote and opens a fraud flag when it
 * looks abusive, so the admin fraud queue actually has real votes to review instead of sitting
 * permanently empty. Deliberately cheap (a couple of indexed counts) since this runs inline
 * right after every vote is confirmed.
 */
class FraudDetectionService
{
    /** A voter identity casting more than this many verified votes in one campaign within RAPID_WINDOW_MINUTES is flagged. */
    private const RAPID_VOTE_THRESHOLD = 10;

    private const RAPID_WINDOW_MINUTES = 10;

    public function evaluate(Vote $vote): void
    {
        if ($vote->vote_status !== 'verified') {
            return;
        }

        $this->checkIpVelocity($vote);
        $this->checkVoterVelocity($vote);
    }

    /** Same IP pushing more verified votes into one campaign than the admin-configured cap, in the last 24h. */
    private function checkIpVelocity(Vote $vote): void
    {
        if (! $vote->ip_address) {
            return;
        }

        $limit = (int) (PlatformSetting::resolved()['max_votes_per_ip'] ?? 0);
        if ($limit <= 0) {
            return;
        }

        $count = Vote::where('campaign_id', $vote->campaign_id)
            ->where('ip_address', $vote->ip_address)
            ->where('vote_status', 'verified')
            ->where('created_at', '>=', now()->subDay())
            ->count();

        if ($count <= $limit) {
            return;
        }

        $this->flag(
            $vote,
            "IP {$vote->ip_address} has cast {$count} verified votes in this campaign in the last 24 hours (cap is {$limit}).",
            $count > $limit * 2 ? 'High' : 'Medium',
        );
    }

    /** Same phone/account casting an unusually high number of votes in a short burst — likely scripted. */
    private function checkVoterVelocity(Vote $vote): void
    {
        $query = Vote::where('campaign_id', $vote->campaign_id)
            ->where('vote_status', 'verified')
            ->where('created_at', '>=', now()->subMinutes(self::RAPID_WINDOW_MINUTES));

        if ($vote->voter_phone) {
            $query->where('voter_phone', $vote->voter_phone);
            $who = "Phone {$vote->voter_phone}";
        } elseif ($vote->voter_user_id) {
            $query->where('voter_user_id', $vote->voter_user_id);
            $who = "Account #{$vote->voter_user_id}";
        } else {
            return;
        }

        $count = $query->count();

        if ($count <= self::RAPID_VOTE_THRESHOLD) {
            return;
        }

        $this->flag(
            $vote,
            "{$who} cast {$count} verified votes in this campaign within ".self::RAPID_WINDOW_MINUTES.' minutes.',
            'High',
        );
    }

    /** One open flag per vote is enough — repeat evaluations (e.g. more votes rolling in) won't spam duplicates. */
    private function flag(Vote $vote, string $reason, string $risk): void
    {
        FraudFlag::firstOrCreate(
            ['vote_id' => $vote->id, 'status' => 'open'],
            ['campaign_id' => $vote->campaign_id, 'reason' => $reason, 'risk' => $risk],
        );
    }
}
