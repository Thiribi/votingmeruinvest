<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\HidesAdminIdentity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Renders a Conversation in the same shape as a feed Post, so a newly started conversation
 * surfaces immediately in the homepage Community feed alongside regular posts. See
 * FeedController::index(), which merges this with PostResource output.
 */
class ConversationFeedResource extends JsonResource
{
    use HidesAdminIdentity;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => 'conversation',
            'author' => $this->whenLoaded('user', fn () => $this->displayName($this->user)),
            'author_role' => $this->whenLoaded('user', fn () => $this->user->role),
            'organization' => $this->whenLoaded('user', fn () => $this->user->organization?->name),
            'body' => $this->title,
            'image_url' => null,
            'likes' => 0,
            'comments' => $this->messages_count,
            'liked_by_me' => false,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
