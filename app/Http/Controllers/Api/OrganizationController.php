<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    public function index(Request $request)
    {
        $organizations = Organization::query()
            ->withCount(['campaigns as active_campaigns' => fn ($q) => $q->where('status', 'live')])
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return OrganizationResource::collection($organizations);
    }

    public function show(Organization $organization)
    {
        $organization->loadCount(['campaigns as active_campaigns' => fn ($q) => $q->where('status', 'live')]);

        return new OrganizationResource($organization);
    }

    public function store(StoreOrganizationRequest $request)
    {
        $data = $request->validated();

        $data['slug'] = $this->uniqueSlug($data['name']);
        $data['status'] = $data['status'] ?? 'active';
        $data['verified'] = $data['verified'] ?? false;

        $organization = Organization::create($data);

        return new OrganizationResource($organization->loadCount(['campaigns as active_campaigns' => fn ($q) => $q->where('status', 'live')]));
    }

    public function update(UpdateOrganizationRequest $request, Organization $organization)
    {
        $data = $request->validated();

        if (isset($data['name']) && $data['name'] !== $organization->name) {
            $data['slug'] = $this->uniqueSlug($data['name'], $organization->id);
        }

        $organization->update($data);

        return new OrganizationResource($organization->loadCount(['campaigns as active_campaigns' => fn ($q) => $q->where('status', 'live')]));
    }

    public function destroy(Organization $organization)
    {
        $organization->delete();

        return response()->json(['ok' => true]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (Organization::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-".++$i;
        }

        return $slug;
    }
}
