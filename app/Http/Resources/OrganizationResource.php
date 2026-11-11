<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'industry' => $this->industry,
            'website' => $this->website,
            'status' => $this->status,
            'verified' => $this->verified,
            'active_campaigns' => (int) ($this->active_campaigns ?? 0),
            'logo_url' => $this->logo_url,
            'contact_name' => $this->contact_name,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            'contact_role' => $this->contact_role,
        ];
    }
}
