<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
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
            'post_id' => $this->post_id,
            'body' => $this->body,
            'author' => $this->whenLoaded('user', fn () => $this->user->name),
            'author_avatar' => $this->whenLoaded('user', fn () => $this->user->avatar_url),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
