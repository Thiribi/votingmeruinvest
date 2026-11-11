<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;

class PermissionController extends Controller
{
    public function index()
    {
        return PermissionResource::collection(Permission::orderBy('name')->get());
    }
}
