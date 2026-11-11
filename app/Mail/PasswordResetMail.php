<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Self-service "forgot password" email — a branded button linking straight to /reset-password. */
class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        public readonly string $resetUrl,
        public readonly int $expiresMinutes = 60,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset your FansBench password');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'subject' => 'Reset your FansBench password',
                'name' => $this->name,
                'resetUrl' => $this->resetUrl,
                'expiresMinutes' => $this->expiresMinutes,
            ],
        );
    }
}
