<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Vote;
use Illuminate\Http\Request;

class VoteMapController extends Controller
{
    /**
     * Geo-tagged vote points for the admin vote-density map, optionally filtered to a single
     * category or organization (via the vote's campaign). Only votes that have a location.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'category_id' => ['nullable', 'integer'],
            'organization_id' => ['nullable', 'integer'],
        ]);

        $points = Vote::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->when(
                ! empty($data['category_id']),
                fn ($q) => $q->whereHas('campaign', fn ($c) => $c->where('category_id', $data['category_id'])),
            )
            ->when(
                ! empty($data['organization_id']),
                fn ($q) => $q->whereHas('campaign', fn ($c) => $c->where('organization_id', $data['organization_id'])),
            )
            ->with([
                'campaign:id,title,category_id,category_label,organization_id',
                'option.nominee:id,name',
                'county:id,name',
            ])
            ->latest()
            ->limit(3000)
            ->get()
            ->map(fn (Vote $v) => [
                'id' => $v->id,
                'latitude' => (float) $v->latitude,
                'longitude' => (float) $v->longitude,
                'campaign' => $v->campaign?->title,
                'nominee' => $v->option?->nominee?->name ?? $v->option?->label,
                'county' => $v->county?->name,
                'status' => $v->vote_status,
            ]);

        return response()->json(['data' => $points]);
    }
}
