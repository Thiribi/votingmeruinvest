<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VoteResource extends JsonResource
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
            'campaign_id' => $this->campaign_id,
            'campaign_title' => $this->whenLoaded('campaign', fn () => $this->campaign?->title),
            'option_id' => $this->campaign_option_id,
            'option_label' => $this->whenLoaded('option', fn () => $this->option?->nominee?->name ?? $this->option?->label),
            'voter_id' => $this->voter_user_id,
            'status' => $this->vote_status,
            'mpesa_reference' => $this->mpesa_reference,
            'created_at' => $this->created_at?->toISOString(),
            'checkout_request_id' => $this->whenLoaded('paymentTransaction', fn () => $this->paymentTransaction?->checkout_request_id),
        ];
    }
}
