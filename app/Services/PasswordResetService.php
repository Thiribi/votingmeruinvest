<?php

namespace App\Services;

use App\Mail\PasswordResetMail;
use App\Mail\WelcomeAccountMail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetService
{
    /** How long a reset link stays valid, minutes. Matches ResetPasswordRequest's expectations. */
    public const TTL_MINUTES = 60;

    /** Self-service "forgot password" — the recipient asked for this themselves. */
    public function sendResetLink(User $user): void
    {
        $url = $this->issueToken($user);

        Mail::to($user->email)->send(new PasswordResetMail(
            name: $user->first_name ?? $user->name,
            resetUrl: $url,
            expiresMinutes: self::TTL_MINUTES,
        ));
    }

    /**
     * An admin created this account (fan or staff) — the recipient didn't ask for this, so the
     * copy is a warm "welcome" rather than a "did you request this?" reset notice.
     */
    public function sendWelcomeLink(User $user, bool $isFan, string $roleLabel = ''): void
    {
        $url = $this->issueToken($user);

        Mail::to($user->email)->send(new WelcomeAccountMail(
            name: $user->first_name ?? $user->name,
            resetUrl: $url,
            isFan: $isFan,
            roleLabel: $roleLabel,
            expiresMinutes: self::TTL_MINUTES,
        ));
    }

    /** Issues a fresh opaque reset token for the user and returns the full reset URL. */
    private function issueToken(User $user): string
    {
        $token = Str::random(48);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        $query = http_build_query(['email' => $user->email, 'token' => $token]);

        // config('app.frontend_url') is the internal-only address FrontendProxyController uses
        // for its server-side PHP->Node hop (e.g. http://127.0.0.1:3010) — never reachable from
        // outside the server, so it must never appear in a link shown to an actual person.
        // config('app.url') is the real public domain; that's what belongs in an email.
        return rtrim(config('app.url'), '/')."/reset-password?{$query}";
    }
}
