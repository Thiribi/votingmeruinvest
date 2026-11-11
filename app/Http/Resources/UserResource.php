<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // loadMissing is a no-op when the caller already eager-loaded these (e.g. the
        // admin user index), so listing many users doesn't issue 2 extra queries each.
        $this->loadMissing(['roles.permissions', 'permissions']);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'mpesa_phone' => $this->mpesa_phone,
            'avatar_url' => $this->avatar_url,
            'role' => $this->role,
            'roles' => $this->roles->pluck('name')->values(),
            'permissions' => $this->permissions->pluck('name')
                ->merge($this->roles->flatMap->permissions->pluck('name'))
                ->unique()
                ->values(),
            'verified_at' => $this->verified_at?->toISOString(),
            'suspended_at' => $this->suspended_at?->toISOString(),
            'deletion_requested_at' => $this->deletion_requested_at?->toISOString(),
            'archived_at' => $this->archived_at?->toISOString(),
            'organization_id' => $this->organization_id,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'location_captured_at' => $this->location_captured_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
