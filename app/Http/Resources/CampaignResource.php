<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
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
            'title' => $this->title,
            'organization_id' => $this->organization_id,
            'organization' => new OrganizationResource($this->whenLoaded('organization')),
            'category_id' => $this->category_id,
            'category' => $this->category_label ?? $this->whenLoaded('category', fn () => $this->category?->name),
            'visibility' => $this->visibility,
            'starts_at' => $this->starts_at?->toISOString(),
            'closes_at' => $this->closes_at?->toISOString(),
            'status' => $this->status,
            'feedback_options' => $this->feedback_options ?? [],
            'options' => CampaignOptionResource::collection($this->whenLoaded('options')),
            'invite_url' => $this->invite_url ?? null,
            // Per-recipient single-use links, only present on the create response.
            'invites' => $this->invites ?? null,
            'allowed_emails' => $this->whenLoaded('accessTokens', fn () => $this->accessTokens->pluck('email')->values()),
        ];
    }
}
