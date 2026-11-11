<?php

return [

    // Advanta Africa SMS gateway. Credentials (partnerID/apiKey/shortcode) are managed
    // by admins via the sms_credentials table, not here — only the API host is env-config.
    'base_url' => env('ADVANTA_BASE_URL', 'https://quicksms.advantasms.com'),

];
