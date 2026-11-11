<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\HidesAdminIdentity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationMessageResource extends JsonResource
{
    use HidesAdminIdentity;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isAdmin = $this->whenLoaded('user', fn () => $this->user->role === 'admin', false);

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'user_id' => $this->user_id,
            'body' => $this->body,
            'author' => $this->whenLoaded('user', fn () => $this->displayName($this->user)),
            // Hiding the admin's name shouldn't hide that this was an official reply —
            // matches the client's "show replied by admin" ask for conversation threads.
            'author_is_admin' => $isAdmin,
            'author_avatar' => $this->whenLoaded('user', fn () => $isAdmin ? null : $this->user->avatar_url),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
