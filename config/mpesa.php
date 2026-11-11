<?php

return [
    'env' => env('MPESA_ENV', 'sandbox'),

    'base_url' => env('MPESA_ENV', 'sandbox') === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke',

    'consumer_key' => env('MPESA_CONSUMER_KEY'),
    'consumer_secret' => env('MPESA_CONSUMER_SECRET'),

    // BusinessShortCode (used in the STK push Password hash) and PartyB (the till/paybill that
    // actually receives funds) can differ for a Buy Goods setup - support both env names, and
    // fall back to the older MPESA_SHORTCODE var or to the business shortcode itself if PartyB
    // isn't set separately.
    'shortcode' => env('MPESA_BUSINESS_SHORTCODE', env('MPESA_SHORTCODE')),
    'party_b' => env('MPESA_PARTYB', env('MPESA_BUSINESS_SHORTCODE', env('MPESA_SHORTCODE'))),
    'passkey' => env('MPESA_PASSKEY'),
    'transaction_type' => env('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),

    'callback_url' => env('MPESA_CALLBACK_URL'),
    // Shared secret embedded in the callback URL path so we can tell a genuine Daraja callback apart from a
    // forged one - Safaricom does not cryptographically sign STK callbacks the way most webhook providers do.
    // Defaults to the value the app has been live with (see MpesaService's former hardcoded constant) so
    // switching this class over to config-driven values can't silently break in-flight/queued callbacks.
    'callback_secret' => env('MPESA_CALLBACK_SECRET') ?: 'df0e0499d21545d4fc4d13609efd20a5bdd154932fa688edb9744d90f8bd4407',

    // The fixed KES fee that verifies participation - it does not "buy" votes.
    'verification_fee' => (float) env('MPESA_VERIFICATION_FEE', 10),

    'transaction_desc' => env('MPESA_TRANSACTION_DESC', 'FansBench verification'),
];
