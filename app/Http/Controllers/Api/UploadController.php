<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    /**
     * Stores an admin-picked picture (category/subcategory/nominee image, etc.) on the public
     * disk and hands back its URL. Every image/avatar/logo field across the app (Nominee,
     * Category, Subcategory, Organization, User, FeedPost) is just a URL string — this is the
     * one place that turns an uploaded file into one, so the admin forms can offer a real file
     * picker instead of asking for a pre-hosted link.
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => ['required', 'image', 'max:5120'], // 5MB
        ]);

        $path = $request->file('file')->store('uploads', 'public');

        // Prefixed with the request's own host rather than config('app.url'): in local dev
        // the API is commonly reached on a different port than APP_URL declares (e.g. the
        // Vite proxy hitting php artisan serve on :8000 while APP_URL is just
        // http://localhost), which produced image URLs that silently 404'd — nothing
        // loaded, and <AvatarImage> just falls back to its icon without ever surfacing an
        // error. Mirroring whatever host actually served this request is correct in every
        // environment, dev or prod, regardless of what APP_URL happens to say.
        $relativeUrl = Storage::disk('public')->url($path);
        $url = $request->getSchemeAndHttpHost().'/'.ltrim(parse_url($relativeUrl, PHP_URL_PATH), '/');

        return response()->json(['url' => $url]);
    }
}
