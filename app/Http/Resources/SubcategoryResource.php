<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubcategoryResource extends JsonResource
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
            'category_id' => $this->category_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'is_active' => $this->is_active,
            'season_starts_at' => $this->season_starts_at?->toISOString(),
            'season_ends_at' => $this->season_ends_at?->toISOString(),
            'is_recurring' => $this->is_recurring,
            'archived_at' => $this->archived_at?->toISOString(),
        ];
    }
}
