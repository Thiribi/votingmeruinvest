<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksArchivedVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNomineeRequest;
use App\Http\Requests\UpdateNomineeRequest;
use App\Http\Resources\NomineeResource;
use App\Models\Nominee;
use App\Models\Subcategory;
use App\Models\Vote;
use App\Services\CampaignSyncService;
use Illuminate\Http\Request;

class NomineeController extends Controller
{
    use ChecksArchivedVisibility;

    public function __construct(private readonly CampaignSyncService $campaignSync)
    {
    }

    public function index(Request $request)
    {
        $nominees = Nominee::query()
            ->unless($this->maySeeArchived($request, 'nominees.manage'), fn ($q) => $q->notArchived())
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->input('category_id')))
            ->when($request->filled('subcategory_id'), fn ($q) => $q->where('subcategory_id', $request->input('subcategory_id')))
            ->orderByDesc('votes_count')
            ->paginate($request->integer('per_page', 15));

        return NomineeResource::collection($nominees);
    }

    public function show(Request $request, Nominee $nominee)
    {
        if ($nominee->isArchived() && ! $this->maySeeArchived($request, 'nominees.manage')) {
            abort(404);
        }

        return new NomineeResource($nominee);
    }

    public function leaderboard(Request $request)
    {
        $nominees = Nominee::query()
            ->notArchived()
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->input('category_id')))
            ->when($request->filled('subcategory_id'), fn ($q) => $q->where('subcategory_id', $request->input('subcategory_id')))
            ->orderByDesc('votes_count')
            ->limit($request->integer('limit', 20))
            ->get();

        return NomineeResource::collection($nominees);
    }

    /**
     * "Trending today" for the landing page right rail — ranked by verified votes cast in the
     * last 24 hours, not the lifetime votes_count leaderboard uses. Falls back to the all-time
     * leaderboard (flagged via `window`) when nothing's been voted on in the last day, so the
     * panel never renders empty just because it's quiet right now.
     */
    public function trending(Request $request)
    {
        $limit = $request->integer('limit', 4);

        $recentVotes = Vote::query()
            ->join('campaign_options', 'campaign_options.id', '=', 'votes.campaign_option_id')
            ->where('votes.vote_status', 'verified')
            ->where('votes.created_at', '>=', now()->subDay())
            ->whereNotNull('campaign_options.nominee_id')
            ->selectRaw('campaign_options.nominee_id as nominee_id, COUNT(*) as recent_votes')
            ->groupBy('campaign_options.nominee_id')
            ->orderByDesc('recent_votes')
            ->limit($limit)
            ->pluck('recent_votes', 'nominee_id');

        if ($recentVotes->isEmpty()) {
            $nominees = Nominee::notArchived()->orderByDesc('votes_count')->limit($limit)->get();

            return response()->json([
                'data' => NomineeResource::collection($nominees),
                'window' => 'all_time',
            ]);
        }

        $nominees = Nominee::whereIn('id', $recentVotes->keys())
            ->notArchived()
            ->get()
            ->sortByDesc(fn (Nominee $n) => $recentVotes[$n->id])
            ->values();

        return response()->json([
            'data' => NomineeResource::collection($nominees),
            'window' => '24h',
        ]);
    }

    public function archive(Nominee $nominee)
    {
        $nominee->archive();
        $this->campaignSync->syncCategory($nominee->category);

        return new NomineeResource($nominee);
    }

    public function unarchive(Nominee $nominee)
    {
        $nominee->unarchive();
        $this->campaignSync->syncCategory($nominee->category);

        return new NomineeResource($nominee);
    }

    public function store(StoreNomineeRequest $request, Subcategory $subcategory)
    {
        $data = $request->validated();

        $data['subcategory_id'] = $subcategory->id;
        $data['category_id'] = $subcategory->category_id;
        $data['votes_count'] = 0;

        $nominee = Nominee::create($data);
        $this->campaignSync->syncCategory($subcategory->category);

        return new NomineeResource($nominee);
    }

    public function update(UpdateNomineeRequest $request, Nominee $nominee)
    {
        $nominee->update($request->validated());

        return new NomineeResource($nominee);
    }

    /**
     * Copies a nominee that legitimately competes in more than one category/subcategory
     * (e.g. a club appearing in both "World's Favourite Club" and a national-league
     * subcategory) instead of the admin re-typing name/tag/bio/photo from scratch each time.
     * The copy starts at 0 votes and is otherwise a fully independent Nominee row.
     */
    public function duplicate(Request $request, Nominee $nominee)
    {
        $data = $request->validate([
            'subcategory_id' => ['required', 'exists:subcategories,id'],
        ]);

        $target = Subcategory::findOrFail($data['subcategory_id']);

        $copy = Nominee::create([
            'category_id' => $target->category_id,
            'subcategory_id' => $target->id,
            'name' => $nominee->name,
            'tag' => $nominee->tag,
            'bio' => $nominee->bio,
            'avatar_url' => $nominee->avatar_url,
            'votes_count' => 0,
        ]);

        $this->campaignSync->syncCategory($target->category);

        return new NomineeResource($copy);
    }

    public function destroy(Nominee $nominee)
    {
        $nominee->delete();

        return response()->json(['ok' => true]);
    }
}
