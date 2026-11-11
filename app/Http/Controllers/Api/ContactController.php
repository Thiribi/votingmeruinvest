<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendContactRequest;
use App\Models\ContactMessage;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function send(SendContactRequest $request)
    {
        $data = $request->validated();

        $contactMessage = ContactMessage::create($data);

        $recipient = config('services.contact.recipient');

        if ($recipient) {
            Mail::raw("New contact message from {$data['name']} <{$data['email']}>:\n\n{$data['message']}", function ($message) use ($recipient, $data) {
                $message->to($recipient)->subject('New FansBench contact message')->replyTo($data['email'], $data['name']);
            });
        }

        $contactMessage->update(['sent_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
