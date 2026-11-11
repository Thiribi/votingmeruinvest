<?php

use App\Http\Controllers\FrontendProxyController;
use Illuminate\Support\Facades\Route;

// Forward everything that isn't an API/Laravel route to the frontend dev server, so the
// whole app is reachable from this single port. See FrontendProxyController for caveats.
Route::any('/{any?}', FrontendProxyController::class)
    ->where('any', '^(?!api\/|sanctum\/|up$).*$');
