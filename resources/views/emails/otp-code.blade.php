@include('emails.partials.header', ['subject' => $subject])

<h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0F172A;">{{ $heading }}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">{{ $intro }}</p>

<div style="text-align:center;margin:0 0 24px;">
    <span style="display:inline-block;padding:16px 28px;border-radius:14px;background:#EFF6FF;border:1px dashed #2F80ED;font-size:34px;font-weight:800;letter-spacing:0.35em;color:#12355B;">
        {{ $code }}
    </span>
</div>

<p style="margin:0 0 8px;font-size:13px;color:#64748B;">
    This code expires in {{ $expiresMinutes }} minutes. For your security, never share it with anyone — not even someone claiming to be from FansBench.
</p>

@include('emails.partials.footer')
