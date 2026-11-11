<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignOption;
use App\Models\RankingPeriod;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Validation\ValidationException;

class VoteEligibilityService
{
    public function __construct(private readonly SeasonService $seasons)
    {
    }

    /**
     * Shared eligibility check for authenticated citizens voting on a public campaign,
     * used both when adding a cart item and again at checkout (cart state can go stale).
     * Fans may cast (and pay to verify) as many votes as they like in the same campaign —
     * the only thing that can still block a pick is already holding a verified vote in the
     * option's subcategory for its *current season* (see SeasonService). A subcategory with
     * no season configured has no such restriction at all, same as before this existed.
     */
    public function assertVotable(Campaign $campaign, CampaignOption $option, User $user): void
    {
        if ($campaign->visibility !== 'public' || $campaign->status !== 'live') {
            throw ValidationException::withMessages([
                'campaign_id' => ['This campaign is not open for voting.'],
            ]);
        }

        $period = $this->periodFor($option);

        if (! $period) {
            return;
        }

        $alreadyVoted = Vote::where('ranking_period_id', $period->id)
            ->where('voter_user_id', $user->id)
            ->where('vote_status', 'verified')
            ->exists();

        if (! $alreadyVoted) {
            return;
        }

        $subcategory = $option->nominee->subcategory;
        $message = $subcategory->is_recurring
            ? "You've already voted here this season. Voting reopens once the current season ends on {$period->ends_at->toFormattedDateString()}."
            : "You've already voted here — this subcategory doesn't reopen for repeat voting.";

        throw ValidationException::withMessages(['campaign_id' => [$message]]);
    }

    /** The option's subcategory's current season, or null if it isn't seasoned (or has no subcategory at all). */
    public function periodFor(CampaignOption $option): ?RankingPeriod
    {
        $subcategory = $option->nominee?->subcategory;

        return $subcategory ? $this->seasons->currentPeriod($subcategory) : null;
    }
}
