<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when an admin creates an account directly (fan or staff) — warmer, "welcome" toned
 * copy than the self-service password reset, since the recipient didn't ask for this
 * themselves. Same reset-link mechanism under the hood (see PasswordResetService).
 */
class WelcomeAccountMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        public readonly string $resetUrl,
        public readonly bool $isFan,
        public readonly string $roleLabel = '',
        public readonly int $expiresMinutes = 60,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->isFan ? 'Welcome to FansBench!' : 'You have been invited to FansBench admin',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-account',
            with: [
                'subject' => $this->isFan ? 'Welcome to FansBench!' : 'You have been invited to FansBench admin',
                'name' => $this->name,
                'resetUrl' => $this->resetUrl,
                'isFan' => $this->isFan,
                'roleLabel' => $this->roleLabel,
                'expiresMinutes' => $this->expiresMinutes,
            ],
        );
    }
}
