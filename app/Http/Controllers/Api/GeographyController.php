<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CountyResource;
use App\Http\Resources\SubcountyResource;
use App\Http\Resources\WardResource;
use App\Models\County;
use App\Models\Subcounty;

class GeographyController extends Controller
{
    public function counties()
    {
        return CountyResource::collection(County::orderBy('name')->get());
    }

    public function subcounties(County $county)
    {
        return SubcountyResource::collection($county->subcounties()->orderBy('name')->get());
    }

    public function wards(Subcounty $subcounty)
    {
        return WardResource::collection($subcounty->wards()->orderBy('name')->get());
    }
}
