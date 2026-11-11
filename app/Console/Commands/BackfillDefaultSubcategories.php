<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Subcategory;
use App\Services\CampaignSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillDefaultSubcategories extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'categories:backfill-default-subcategories';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'One-off backfill: give every existing category with zero subcategories a default one named after it, so nominees can be added (new categories get this automatically going forward)';

    public function handle(CampaignSyncService $sync): int
    {
        $categories = Category::doesntHave('subcategories')->get();

        foreach ($categories as $category) {
            Subcategory::create([
                'category_id' => $category->id,
                'name' => $category->name,
                'slug' => Str::slug($category->name),
            ]);
            $sync->syncCategory($category);
            $this->line("Added a default subcategory to \"{$category->name}\".");
        }

        $this->info("Done — backfilled {$categories->count()} categories.");

        return self::SUCCESS;
    }
}
