<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Organization;
use App\Models\User;

class PublicStatsController extends Controller
{
    /** Public, non-sensitive counts for the landing page hero — deliberately separate from the admin-gated /admin/stats. */
    public function index()
    {
        return response()->json([
            'verified_voters' => User::whereNotNull('verified_at')->count(),
            'active_campaigns' => Campaign::where('status', 'live')->count(),
            'organizations' => Organization::where('verified', true)->count(),
            'verification_fee' => (float) config('mpesa.verification_fee'),
        ]);
    }
}
