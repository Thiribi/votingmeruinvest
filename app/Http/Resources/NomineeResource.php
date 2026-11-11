<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NomineeResource extends JsonResource
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
            'tag' => $this->tag,
            'bio' => $this->bio,
            'avatar_url' => $this->avatar_url,
            'category_id' => $this->category_id,
            'subcategory_id' => $this->subcategory_id,
            // Lets share links resolve straight to /vote/{slug} instead of ?category_id=&subcategory_id= —
            // only populated when the subcategory relation was actually eager-loaded upstream.
            'subcategory_slug' => $this->whenLoaded('subcategory', fn () => $this->subcategory?->slug),
            'votes_count' => $this->votes_count,
            'archived_at' => $this->archived_at?->toISOString(),
        ];
    }
}
