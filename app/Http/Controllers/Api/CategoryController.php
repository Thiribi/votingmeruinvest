<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksArchivedVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Vote;
use App\Services\CampaignSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    use ChecksArchivedVisibility;

    public function __construct(private readonly CampaignSyncService $campaignSync)
    {
    }

    /**
     * Public "votes cast per category" tally, shown on the landing page before login.
     */
    public function board()
    {
        $counts = Vote::query()
            ->join('campaigns', 'campaigns.id', '=', 'votes.campaign_id')
            ->where('votes.vote_status', 'verified')
            ->whereNotNull('campaigns.category_id')
            ->selectRaw('campaigns.category_id as category_id, COUNT(*) as verified_votes')
            ->groupBy('campaigns.category_id')
            ->pluck('verified_votes', 'category_id');

        $board = Category::query()
            ->notArchived()
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'verified_votes' => (int) ($counts[$category->id] ?? 0),
            ])
            ->sortByDesc('verified_votes')
            ->values();

        return response()->json(['data' => $board]);
    }

    public function index(Request $request)
    {
        $withArchived = $this->maySeeArchived($request, 'categories.manage');

        $categories = Category::withCount('nominees')
            ->withSum(['nominees as votes_total' => fn ($q) => $q->notArchived()], 'votes_count')
            ->with(['subcategories' => $this->subcategoriesQuery($withArchived)])
            ->unless($withArchived, fn ($q) => $q->notArchived())
            ->orderByDesc('votes_total')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return CategoryResource::collection($categories);
    }

    public function show(Request $request, string $idOrSlug)
    {
        $withArchived = $this->maySeeArchived($request, 'categories.manage');

        $category = Category::withCount('nominees')
            ->with(['subcategories' => $this->subcategoriesQuery($withArchived)])
            ->unless($withArchived, fn ($q) => $q->notArchived())
            ->where(is_numeric($idOrSlug) ? 'id' : 'slug', $idOrSlug)
            ->firstOrFail();

        return new CategoryResource($category);
    }

    /**
     * Fans see categories/subcategories ranked by their nominees' verified votes, most-voted
     * first — the tally itself is only ever used to order the query, never returned by
     * CategoryResource/SubcategoryResource (whose toArray() whitelists fields), so it's never
     * rendered.
     */
    private function subcategoriesQuery(bool $withArchived): \Closure
    {
        return function ($q) use ($withArchived) {
            $q->unless($withArchived, fn ($sq) => $sq->notArchived())
                ->withSum(['nominees as votes_total' => fn ($nq) => $nq->notArchived()], 'votes_count')
                ->orderByDesc('votes_total')
                ->orderBy('name');
        };
    }

    public function archive(Category $category)
    {
        $category->archive();
        $this->campaignSync->syncCategory($category);

        return new CategoryResource($category->loadCount('nominees')->load('subcategories'));
    }

    public function unarchive(Category $category)
    {
        $category->unarchive();
        $this->campaignSync->syncCategory($category);

        return new CategoryResource($category->loadCount('nominees')->load('subcategories'));
    }

    public function store(StoreCategoryRequest $request)
    {
        $data = $request->validated();

        $data['slug'] = $this->uniqueSlug($data['name']);
        $data['status'] = $data['status'] ?? 'draft';

        $category = Category::create($data);

        // A category with zero subcategories has nowhere for NomineeController::store to
        // attach a nominee to (it always requires a Subcategory) — give every new category
        // one by default, named after it, so nominees can be added immediately.
        Subcategory::create([
            'category_id' => $category->id,
            'name' => $category->name,
            'slug' => Str::slug($category->name),
        ]);

        $this->campaignSync->syncCategory($category);

        return new CategoryResource($category->loadCount('nominees')->load('subcategories'));
    }

    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $data = $request->validated();

        if (isset($data['name']) && $data['name'] !== $category->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $category->id);
        }

        $category->update($data);
        $this->campaignSync->syncCategory($category);

        return new CategoryResource($category->loadCount('nominees')->load('subcategories'));
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json(['ok' => true]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (Category::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-".++$i;
        }

        return $slug;
    }
}
