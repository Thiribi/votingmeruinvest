<?php

namespace App\Jobs;

use App\Services\AdvantaSmsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendSmsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public readonly string $phone,
        public readonly string $message,
    ) {}

    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function handle(AdvantaSmsService $sms): void
    {
        $sms->send($this->phone, $this->message);
    }
}
