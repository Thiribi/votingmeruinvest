<?php

namespace App\Console\Commands;

use App\Models\OtpChallenge;
use Illuminate\Console\Command;

class InvalidateUsedOtps extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'otp:invalidate-used';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire already-used OTP challenges and prune old expired ones';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $invalidated = OtpChallenge::whereNotNull('verified_at')
            ->where('expires_at', '>', now())
            ->update(['expires_at' => now()]);

        $pruned = OtpChallenge::where('expires_at', '<', now()->subDay())->delete();

        $this->info("Invalidated {$invalidated} used OTP challenge(s); pruned {$pruned} stale row(s).");
    }
}
