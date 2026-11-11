<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Services\CampaignSyncService;
use Illuminate\Console\Command;

class SyncCategoryCampaigns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'campaigns:sync-categories';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create/update the public voting campaign for every category so its nominees show up on /vote (one-off backfill; new changes sync automatically going forward)';

    public function handle(CampaignSyncService $sync): int
    {
        $categories = Category::withCount('nominees')->get();

        foreach ($categories as $category) {
            $sync->syncCategory($category);
            $this->line("Synced \"{$category->name}\" ({$category->status}, {$category->nominees_count} nominees).");
        }

        $this->info("Done — synced {$categories->count()} categories.");

        return self::SUCCESS;
    }
}
