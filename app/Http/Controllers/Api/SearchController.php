<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Category;
use App\Models\Nominee;
use App\Models\Organization;
use App\Models\Subcategory;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /** How many hits to return per entity group. */
    private const PER_GROUP = 6;

    /**
     * Universal public search across the platform's browsable content — categories,
     * subcategories, nominees, organizations and public campaigns. Deliberately excludes
     * users, admin data and private campaigns so it is safe to expose to anonymous visitors.
     *
     * Returns a flat, typed result list the frontend maps to routes, so adding a new
     * searchable entity here never requires a new endpoint.
     */
    public function __invoke(Request $request)
    {
        $term = trim((string) $request->query('q', ''));

        // Two chars keeps the query cheap and the results meaningful (single letters match everything).
        if (mb_strlen($term) < 2) {
            return response()->json(['query' => $term, 'results' => []]);
        }

        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
        $results = [];

        Category::query()
            ->notArchived()
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('description', 'like', $like))
            ->orderBy('name')
            ->limit(self::PER_GROUP)
            ->get()
            ->each(function (Category $c) use (&$results) {
                $results[] = [
                    'type' => 'category',
                    'id' => $c->id,
                    'title' => $c->name,
                    'subtitle' => $c->description,
                    'slug' => $c->slug,
                ];
            });

        Subcategory::query()
            ->notArchived()
            ->where('name', 'like', $like)
            ->with('category:id,name')
            ->orderBy('name')
            ->limit(self::PER_GROUP)
            ->get()
            ->each(function (Subcategory $s) use (&$results) {
                $results[] = [
                    'type' => 'subcategory',
                    'id' => $s->id,
                    'title' => $s->name,
                    'subtitle' => $s->category?->name,
                    'category_id' => $s->category_id,
                ];
            });

        Nominee::query()
            ->notArchived()
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('tag', 'like', $like)->orWhere('bio', 'like', $like))
            ->orderByDesc('votes_count')
            ->limit(self::PER_GROUP)
            ->get()
            ->each(function (Nominee $n) use (&$results) {
                $results[] = [
                    'type' => 'nominee',
                    'id' => $n->id,
                    'title' => $n->name,
                    'subtitle' => $n->tag,
                    'votes_count' => $n->votes_count,
                    // So the frontend can jump straight into voting for this nominee
                    // instead of dropping the fan on a generic, unfiltered ranking.
                    'category_id' => $n->category_id,
                    'subcategory_id' => $n->subcategory_id,
                ];
            });

        Organization::query()
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('description', 'like', $like)->orWhere('industry', 'like', $like))
            ->orderBy('name')
            ->limit(self::PER_GROUP)
            ->get()
            ->each(function (Organization $o) use (&$results) {
                $results[] = [
                    'type' => 'organization',
                    'id' => $o->id,
                    'title' => $o->name,
                    'subtitle' => $o->industry,
                    'verified' => (bool) $o->verified,
                ];
            });

        Campaign::query()
            ->where('visibility', 'public')
            ->where('title', 'like', $like)
            ->orderByDesc('id')
            ->limit(self::PER_GROUP)
            ->get()
            ->each(function (Campaign $c) use (&$results) {
                $results[] = [
                    'type' => 'campaign',
                    'id' => $c->id,
                    'title' => $c->title,
                    'subtitle' => $c->category_label,
                    'status' => $c->status,
                ];
            });

        return response()->json(['query' => $term, 'results' => $results]);
    }
}
