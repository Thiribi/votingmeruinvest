<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class FrontendProxyController extends Controller
{
    /**
     * Forward everything that isn't an API/Laravel route to the Vite dev server, so the
     * frontend is reachable from the same port as the API. Regular requests proxy fine;
     * Vite's HMR websocket cannot be proxied by PHP's built-in dev server, so live
     * hot-reload won't work through this port (browser will fall back to full reloads).
     */
    public function __invoke(Request $request, string $any = '')
    {
        $target = rtrim(config('app.frontend_url'), '/').'/'.ltrim($any, '/');

        $response = Http::withHeaders($this->forwardableHeaders($request))
            ->withBody($request->getContent(), $request->header('Content-Type', 'application/octet-stream'))
            ->withOptions(['allow_redirects' => false])
            ->send($request->method(), $target, ['query' => $request->query()]);

        return response($response->body(), $response->status())
            ->withHeaders($this->forwardableResponseHeaders($response));
    }

    private function forwardableHeaders(Request $request): array
    {
        $skip = ['host', 'content-length', 'connection'];

        return collect($request->headers->all())
            ->reject(fn ($value, $key) => in_array(strtolower($key), $skip))
            ->map(fn ($value) => $value[0] ?? '')
            ->all();
    }

    private function forwardableResponseHeaders(Response $response): array
    {
        $skip = ['content-encoding', 'transfer-encoding', 'content-length', 'connection'];

        return collect($response->headers())
            ->reject(fn ($value, $key) => in_array(strtolower($key), $skip))
            ->map(fn ($value) => $value[0] ?? '')
            ->all();
    }
}
