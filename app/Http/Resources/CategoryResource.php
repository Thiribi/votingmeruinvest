<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
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
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'nominees_count' => $this->whenCounted('nominees'),
            'status' => $this->status,
            'archived_at' => $this->archived_at?->toISOString(),
            'parent_id' => $this->parent_id,
            'subcategories' => SubcategoryResource::collection($this->whenLoaded('subcategories')),
        ];
    }
}
