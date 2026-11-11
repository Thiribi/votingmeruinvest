<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\OtpChallenge;
use App\Models\User;
use App\Services\IpGeolocationService;
use App\Services\OtpService;
use App\Services\PasswordResetService;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
        private readonly PasswordResetService $passwordReset,
    ) {}

    public function register(RegisterRequest $request)
    {
        $data = $request->validated();

        $phone = PhoneNumber::normalize($data['phone']);

        if (User::where('phone', $phone)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['This phone number is already registered.'],
            ]);
        }

        $user = User::create([
            'name' => trim("{$data['first_name']} {$data['last_name']}"),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $phone,
            'password' => $data['password'],
            'user_classification' => 'citizen',
            'role' => 'fan',
        ]);

        try {
            $challenge = $this->otp->issueChallenge($user, 'registration');
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'email' => ['We could not send a verification code by email or SMS. Please try again shortly.'],
            ]);
        }

        return response()->json([
            'challenge' => $this->challengeResponse($challenge),
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $this->assertLoginAllowed($user);

        try {
            $challenge = $this->otp->issueChallenge($user, 'login');
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'email' => ['We could not send a verification code by email or SMS. Please try again shortly.'],
            ]);
        }

        return response()->json([
            'challenge' => $this->challengeResponse($challenge),
            'user' => new UserResource($user),
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request)
    {
        $data = $request->validated();

        $challenge = OtpChallenge::with('user')->findOrFail($data['challenge_id']);

        if ($challenge->isVerified()) {
            throw ValidationException::withMessages([
                'challenge_id' => ['This code has already been used. Please request a new one.'],
            ]);
        }

        if ($challenge->isExpired()) {
            throw ValidationException::withMessages([
                'challenge_id' => ['This verification code has expired. Please request a new one.'],
            ]);
        }

        if ($challenge->attempts >= OtpService::MAX_ATTEMPTS) {
            throw ValidationException::withMessages([
                'challenge_id' => ['Too many failed attempts. Please request a new code.'],
            ]);
        }

        if (! $this->otp->verify($challenge, $data['otp'])) {
            throw ValidationException::withMessages([
                'otp' => ['That code is incorrect.'],
            ]);
        }

        $user = $challenge->user;
        $this->assertLoginAllowed($user);

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
            'phone_verified_at' => $user->phone_verified_at ?? now(),
            'verified_at' => now(),
        ])->save();

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function resendOtp(ResendOtpRequest $request)
    {
        $data = $request->validated();

        $challenge = OtpChallenge::with('user')->findOrFail($data['challenge_id']);

        try {
            $challenge = $this->otp->resend($challenge);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'challenge_id' => ['We could not resend a code right now. Please try again shortly.'],
            ]);
        }

        return response()->json($this->challengeResponse($challenge));
    }

    public function me(Request $request)
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Persist the user's geo-location captured at login/registration for the vote-density map.
     * Prefers precise browser coordinates; when they're declined/omitted, falls back to an
     * approximate location derived from the request IP (no permission required).
     */
    public function saveLocation(Request $request, IpGeolocationService $ipGeo)
    {
        $data = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $latitude = $data['latitude'] ?? null;
        $longitude = $data['longitude'] ?? null;

        if ($latitude === null || $longitude === null) {
            $located = $ipGeo->locate($request->ip());
            if ($located) {
                $latitude = $located['latitude'];
                $longitude = $located['longitude'];
            }
        }

        if ($latitude !== null && $longitude !== null) {
            $request->user()->forceFill([
                'latitude' => $latitude,
                'longitude' => $longitude,
                'location_captured_at' => now(),
            ])->save();
        }

        return new UserResource($request->user());
    }

    /** A fan managing their own account — name/phone/mpesa number/avatar only, no email or role. */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'mpesa_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'avatar_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ]);

        $user = $request->user();

        if (isset($data['phone']) && $data['phone'] !== null) {
            $data['phone'] = PhoneNumber::normalize($data['phone']);
        }
        if (isset($data['mpesa_phone']) && $data['mpesa_phone'] !== null) {
            $data['mpesa_phone'] = PhoneNumber::normalize($data['mpesa_phone']);
        }
        if (isset($data['first_name']) || isset($data['last_name'])) {
            $data['name'] = trim(($data['first_name'] ?? $user->first_name).' '.($data['last_name'] ?? $user->last_name));
        }

        $user->update($data);

        return new UserResource($user->fresh());
    }

    /**
     * A fan's own "delete my account" request — queued for admin review rather than acted on
     * immediately (see Admin\UserController::archive), so no data disappears unreviewed.
     */
    public function requestDeletion(Request $request)
    {
        $request->user()->forceFill(['deletion_requested_at' => now()])->save();

        return response()->json(['ok' => true]);
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if ($user) {
            $this->passwordReset->sendResetLink($user);
        }

        return response()->json(['ok' => true]);
    }

    /** Consumes the token from the reset-password email link and sets the new password. */
    public function resetPassword(ResetPasswordRequest $request)
    {
        $data = $request->validated();

        $record = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (! $record
            || ! Hash::check($data['token'], $record->token)
            || now()->diffInMinutes($record->created_at) > PasswordResetService::TTL_MINUTES
        ) {
            throw ValidationException::withMessages([
                'token' => ['This reset link is invalid or has expired. Request a new one.'],
            ]);
        }

        $user = User::where('email', $data['email'])->firstOrFail();
        $user->forceFill(['password' => $data['password']])->save();

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['ok' => true]);
    }

    private function challengeResponse(OtpChallenge $challenge): array
    {
        return [
            'challenge_id' => $challenge->id,
            'expires_in' => max(0, (int) now()->diffInSeconds($challenge->expires_at, false)),
        ];
    }

    /** Blocks a suspended or archived (soft-deleted) account from completing sign-in. */
    private function assertLoginAllowed(User $user): void
    {
        if ($user->isArchived()) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deleted.'],
            ]);
        }

        if ($user->isSuspended()) {
            throw ValidationException::withMessages([
                'email' => ['This account has been suspended. Contact support for help.'],
            ]);
        }
    }
}
