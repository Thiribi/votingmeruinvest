<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FraudFlagResource extends JsonResource
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
            'code' => $this->code(),
            'reason' => $this->reason,
            'campaign' => $this->whenLoaded('campaign', fn () => $this->campaign?->title),
            'risk' => $this->risk,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            // The actual flagged vote, so the reviewer can see what they're validating/voiding.
            'vote' => $this->whenLoaded('vote', function () {
                $vote = $this->vote;

                if (! $vote) {
                    return null;
                }

                return [
                    'id' => $vote->id,
                    'status' => $vote->vote_status,
                    'voter_phone' => $vote->voter_phone,
                    'option' => $vote->option?->label,
                    'ip_address' => $vote->ip_address,
                    'mpesa_reference' => $vote->mpesa_reference,
                    'amount' => $vote->paymentTransaction?->amount,
                    'payment_status' => $vote->paymentTransaction?->status,
                    'cast_at' => $vote->created_at?->toISOString(),
                ];
            }),
        ];
    }
}
