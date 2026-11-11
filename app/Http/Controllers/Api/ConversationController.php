<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConversationMessageRequest;
use App\Http\Requests\StoreConversationRequest;
use App\Http\Resources\ConversationMessageResource;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConversationController extends Controller
{
    /** Public list of conversation threads, most recently active first. */
    public function index(Request $request)
    {
        $conversations = Conversation::with('user')
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return ConversationResource::collection($conversations);
    }

    /**
     * A fan starts a conversation with just an opening message — the thread "title" shown in
     * the list is derived from it (there's no separate title field in the composer anymore).
     */
    public function store(StoreConversationRequest $request)
    {
        $data = $request->validated();

        $conversation = DB::transaction(function () use ($data, $request) {
            $conversation = Conversation::create([
                'user_id' => $request->user()->id,
                'title' => Str::limit(preg_replace('/\s+/', ' ', trim($data['body'])), 80),
                'messages_count' => 1,
                'last_message_at' => now(),
            ]);

            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'user_id' => $request->user()->id,
                'body' => $data['body'],
            ]);

            return $conversation;
        });

        return new ConversationResource($conversation->load('user'));
    }

    /** A single thread with its full message history. */
    public function show(Conversation $conversation)
    {
        $conversation->load(['user', 'messages.user']);

        return new ConversationResource($conversation);
    }

    /** Post a reply into a thread (chat-style). */
    public function postMessage(StoreConversationMessageRequest $request, Conversation $conversation)
    {
        $message = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'user_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        $conversation->increment('messages_count');
        $conversation->update(['last_message_at' => now()]);

        return new ConversationMessageResource($message->load('user'));
    }
}
