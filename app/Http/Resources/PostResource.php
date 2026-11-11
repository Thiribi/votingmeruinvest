<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\HidesAdminIdentity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    use HidesAdminIdentity;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => 'post',
            'author' => $this->whenLoaded('user', fn () => $this->displayName($this->user)),
            'author_role' => $this->whenLoaded('user', fn () => $this->user->role),
            'organization' => $this->whenLoaded('user', fn () => $this->user->organization?->name),
            'body' => $this->body,
            'image_url' => $this->image_url,
            'likes' => $this->likes_count,
            'comments' => $this->comments_count,
            'liked_by_me' => $this->relationLoaded('likes') ? $this->likes->isNotEmpty() : false,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
