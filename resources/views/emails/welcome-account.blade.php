@include('emails.partials.header', ['subject' => $subject])

@if ($isFan)
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0F172A;">Welcome to FansBench, {{ $name }}! 🎉</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        You're in! An account has been created for you so you can back your favourite artists, athletes and brands
        with verified, M-Pesa-confirmed votes. One person, one vote — every time.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        Set your password below to jump straight into the action.
    </p>
@else
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0F172A;">You've been added to the FansBench team 🚀</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Hi {{ $name }}, you've been invited to join FansBench as <strong>{{ $roleLabel }}</strong>. Set your password
        below to finish setting up your admin account.
    </p>
@endif

<div style="text-align:center;margin:0 0 24px;">
    <a href="{{ $resetUrl }}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#F97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
        {{ $isFan ? 'Set my password & get started' : 'Set my password' }}
    </a>
</div>

<p style="margin:0 0 8px;font-size:13px;color:#64748B;">
    This link expires in {{ $expiresMinutes }} minutes. If you weren't expecting this, you can ignore this email.
</p>
<p style="margin:16px 0 0;font-size:12px;color:#94A3B8;word-break:break-all;">
    Button not working? Paste this link into your browser:<br>{{ $resetUrl }}
</p>

@include('emails.partials.footer')
