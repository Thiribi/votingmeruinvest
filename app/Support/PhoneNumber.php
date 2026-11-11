<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalize any Kenyan phone format (0712345678, 712345678, 254712345678,
     * +254712345678, with spaces/dashes, etc.) down to +254712345678.
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        return '+254'.substr($digits, -9);
    }
}
