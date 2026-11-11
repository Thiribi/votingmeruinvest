@include('emails.partials.header', ['subject' => $subject])

<h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0F172A;">Reset your password</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
    Hi {{ $name }}, we got a request to reset the password on your FansBench account. Click the button below to
    choose a new one — it only takes a few seconds.
</p>

<div style="text-align:center;margin:0 0 24px;">
    <a href="{{ $resetUrl }}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#F97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
        Reset my password
    </a>
</div>

<p style="margin:0 0 8px;font-size:13px;color:#64748B;">
    This link expires in {{ $expiresMinutes }} minutes. If you didn't ask to reset your password, you can safely
    ignore this email — your account is still secure.
</p>
<p style="margin:16px 0 0;font-size:12px;color:#94A3B8;word-break:break-all;">
    Button not working? Paste this link into your browser:<br>{{ $resetUrl }}
</p>

@include('emails.partials.footer')
