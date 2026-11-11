<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Approximate, permission-free geolocation from a request IP. Used as a fallback for the
 * vote-density map when a user declines the browser's precise-location prompt — precise GPS
 * is impossible without consent, so this gives a city/region-level estimate instead.
 *
 * Best-effort: any failure (private/local IP, provider down, timeout) resolves to null.
 */
class IpGeolocationService
{
    /**
     * @return array{latitude: float, longitude: float, region: ?string, city: ?string}|null
     */
    public function locate(?string $ip): ?array
    {
        // Private, loopback and reserved ranges can't be geolocated.
        if (! $ip || ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return null;
        }

        return Cache::remember("geoip:{$ip}", now()->addDay(), function () use ($ip) {
            try {
                $response = Http::timeout((int) config('services.ipgeo.timeout', 3))
                    ->get(rtrim((string) config('services.ipgeo.url'), '/')."/{$ip}", [
                        'fields' => 'status,lat,lon,regionName,city',
                    ]);

                $data = $response->json();

                if (($data['status'] ?? null) !== 'success' || ! isset($data['lat'], $data['lon'])) {
                    return null;
                }

                return [
                    'latitude' => (float) $data['lat'],
                    'longitude' => (float) $data['lon'],
                    'region' => $data['regionName'] ?? null,
                    'city' => $data['city'] ?? null,
                ];
            } catch (Throwable) {
                return null;
            }
        });
    }
}
