<?php

namespace App\Services;

use App\Models\RankingPeriod;
use App\Models\Subcategory;
use Carbon\CarbonInterface;

/**
 * Resolves a subcategory's current voting "season" — the mechanism behind the client's
 * request to let a fan vote again in a category once it's a different cycle (e.g. Chelsea
 * 2025 vs. Chelsea 2026), scoped per subcategory rather than forever.
 *
 * A subcategory with no season_starts_at/season_ends_at set has no seasons at all — voting
 * eligibility for it is unrestricted, exactly like before this feature existed. Once an admin
 * sets a season window, the first vote attempt lazily creates the matching RankingPeriod row
 * (there's no scheduler in this app, so evaluation is pull-based, not cron-driven); every
 * later call just returns it until it expires. A recurring subcategory then rolls forward to
 * the next window(s) — catching up through however many cycles have elapsed since the season
 * was last touched — so voting reopens with a clean slate; a non-recurring one just closes,
 * permanently keeping the one-vote-per-fan rule from before.
 */
class SeasonService
{
    public function currentPeriod(Subcategory $subcategory): ?RankingPeriod
    {
        if (! $subcategory->hasSeasons()) {
            return null;
        }

        // The *latest* period ever created for this subcategory, not just an active one —
        // a non-recurring subcategory's period is 'closed' once its window passes, and
        // filtering on status='active' here would never find that closed row again,
        // silently creating a fresh duplicate (with a different id) on every later call
        // and breaking the one-vote-ever check, which is keyed to the original row's id.
        $period = $subcategory->rankingPeriods()->latest('id')->first() ?? $this->createPeriod(
            $subcategory,
            $subcategory->season_starts_at,
            $subcategory->season_ends_at,
        );

        if ($period->ends_at->isFuture()) {
            return $period;
        }

        if (! $subcategory->is_recurring) {
            if ($period->status !== 'closed') {
                $period->update(['status' => 'closed']);
            }

            return $period;
        }

        return $this->renew($subcategory, $period);
    }

    private function renew(Subcategory $subcategory, RankingPeriod $period): RankingPeriod
    {
        $durationSeconds = max(1, $period->starts_at->diffInSeconds($period->ends_at));

        $nextStart = $period->ends_at;
        $nextEnd = $nextStart->copy()->addSeconds($durationSeconds);

        // Catch up through however many full cycles have elapsed since this was last
        // resolved (e.g. a weekly season nobody voted in for two months), so the season
        // that ends up "active" is always the one actually covering right now.
        while ($nextEnd->isPast()) {
            $nextStart = $nextEnd;
            $nextEnd = $nextStart->copy()->addSeconds($durationSeconds);
        }

        $period->update(['status' => 'closed']);

        return $this->createPeriod($subcategory, $nextStart, $nextEnd);
    }

    private function createPeriod(Subcategory $subcategory, CarbonInterface $startsAt, CarbonInterface $endsAt): RankingPeriod
    {
        return RankingPeriod::create([
            'category_id' => $subcategory->category_id,
            'subcategory_id' => $subcategory->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => 'active',
        ]);
    }
}
