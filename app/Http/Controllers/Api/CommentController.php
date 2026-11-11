<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request, Post $post)
    {
        $comments = $post->comments()
            ->with('user')
            ->oldest()
            ->paginate($request->integer('per_page', 20));

        return CommentResource::collection($comments);
    }

    public function store(StoreCommentRequest $request, Post $post)
    {
        $comment = Comment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        $post->increment('comments_count');

        return new CommentResource($comment->load('user'));
    }
}
