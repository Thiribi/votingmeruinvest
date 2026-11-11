<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavedLocationResource extends JsonResource
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
            'label' => $this->label,
            'is_default' => $this->is_default,
            'county_id' => $this->county_id,
            'county_name' => $this->whenLoaded('county', fn () => $this->county->name),
            'subcounty_id' => $this->subcounty_id,
            'subcounty_name' => $this->whenLoaded('subcounty', fn () => $this->subcounty?->name),
            'ward_id' => $this->ward_id,
            'ward_name' => $this->whenLoaded('ward', fn () => $this->ward?->name),
        ];
    }
}
