<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Sent alongside every admin report download — a copy for their inbox, not just the browser. */
class ReportReadyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        public readonly string $reportLabel,
        public readonly string $rangeLabel,
        public readonly string $fileContents,
        public readonly string $fileName,
        public readonly string $mimeType,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Your {$this->reportLabel} report is ready");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.report-ready',
            with: [
                'subject' => "Your {$this->reportLabel} report is ready",
                'name' => $this->name,
                'reportLabel' => $this->reportLabel,
                'rangeLabel' => $this->rangeLabel,
            ],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->fileContents, $this->fileName)
                ->withMime($this->mimeType),
        ];
    }
}
