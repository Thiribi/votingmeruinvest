<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignOption;
use App\Models\Category;

/**
 * Keeps a category's public voting campaign — the thing /vote actually reads from — in sync
 * with the category catalogue managed under Admin > Categories/Subcategories/Nominees.
 *
 * Categories, subcategories and nominees are just catalogue data; a category only becomes
 * votable once a matching public Campaign exists with its nominees mirrored as CampaignOption
 * rows (see CampaignSeeder, which used to be the only place that ever did this, and only for
 * two hardcoded categories). This service is the general-purpose replacement: call it whenever
 * a category or one of its nominees changes, and the public campaign/options are brought back
 * in line.
 */
class CampaignSyncService
{
    public function syncCategory(Category $category): void
    {
        $campaign = Campaign::firstOrNew([
            'category_id' => $category->id,
            'organization_id' => null,
        ]);

        $campaign->title = $campaign->title ?: $category->name;
        $campaign->visibility = 'public';
        // Archiving a category should pull it out of voting even if its status column still
        // says "live" — the two are independently toggleable in the admin UI.
        $campaign->status = ($category->isArchived() && $category->status !== 'closed')
            ? 'draft'
            : $category->status;
        $campaign->ranking_period_id = $category->activeRankingPeriod?->id;
        $campaign->save();

        if ($campaign->status !== 'live') {
            return;
        }

        $nominees = $category->nominees()->notArchived()->get(['id', 'name']);

        foreach ($nominees as $nominee) {
            CampaignOption::firstOrCreate(
                ['campaign_id' => $campaign->id, 'nominee_id' => $nominee->id],
                ['label' => $nominee->name],
            );
        }

        // Drop options for nominees that were archived/removed from this category since the
        // last sync, so they stop showing up as votable on /vote.
        CampaignOption::where('campaign_id', $campaign->id)
            ->whereNotNull('nominee_id')
            ->whereNotIn('nominee_id', $nominees->pluck('id'))
            ->delete();
    }
}
