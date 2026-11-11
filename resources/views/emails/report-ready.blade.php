@include('emails.partials.header', ['subject' => $subject])

<h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0F172A;">Your {{ $reportLabel }} report</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
    Hi {{ $name }}, the {{ $reportLabel }} report you generated for {{ $rangeLabel }} is attached to this email.
</p>

<p style="margin:0;font-size:13px;color:#64748B;">
    Generated from the FansBench admin Reports page.
</p>

@include('emails.partials.footer')
