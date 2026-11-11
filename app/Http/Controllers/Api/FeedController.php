<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeedPostRequest;
use App\Http\Resources\ConversationFeedResource;
use App\Http\Resources\PostResource;
use App\Models\Conversation;
use App\Models\Post;
use App\Models\PostLike;
use Illuminate\Http\Request;

class FeedController extends Controller
{
    /**
     * The homepage feed merges two sources — regular posts and newly started conversations
     * (rendered via ConversationFeedResource) — so a conversation appears in the feed the
     * moment it's created, without waiting on any separate sync step. Sorted together by
     * recency and capped at `per_page`; replies to an existing conversation don't bump it,
     * so the feed stays a chronological record of new activity rather than reshuffling.
     */
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 15);
        $userId = optional(auth('sanctum')->user())->id;

        $posts = Post::with([
            'user.organization',
            'likes' => fn ($q) => $userId ? $q->where('user_id', $userId) : $q->whereRaw('1 = 0'),
        ])
            ->latest()
            ->limit($perPage)
            ->get()
            ->map(fn (Post $post) => (new PostResource($post))->resolve($request));

        $conversations = Conversation::with('user.organization')
            ->latest()
            ->limit($perPage)
            ->get()
            ->map(fn (Conversation $conversation) => (new ConversationFeedResource($conversation))->resolve($request));

        $items = $posts->concat($conversations)
            ->sortByDesc('created_at')
            ->take($perPage)
            ->values();

        return response()->json(['data' => $items]);
    }

    public function store(StoreFeedPostRequest $request)
    {
        $data = $request->validated();

        $post = Post::create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'image_url' => $data['image_url'] ?? null,
            'likes_count' => 0,
            'comments_count' => 0,
        ]);

        return new PostResource($post->load('user.organization'));
    }

    public function like(Request $request, Post $post)
    {
        $created = PostLike::firstOrCreate([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
        ]);

        if ($created->wasRecentlyCreated) {
            $post->increment('likes_count');
        }

        return response()->json(['likes' => $post->fresh()->likes_count]);
    }

    public function unlike(Request $request, Post $post)
    {
        $deleted = PostLike::where('post_id', $post->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        if ($deleted) {
            $post->decrement('likes_count');
        }

        return response()->json(['likes' => $post->fresh()->likes_count]);
    }
}
