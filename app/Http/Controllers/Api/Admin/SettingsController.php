<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\AuditLog;
use App\Models\PlatformSetting;

class SettingsController extends Controller
{
    public function show()
    {
        return response()->json(PlatformSetting::resolved());
    }

    public function update(UpdateSettingsRequest $request)
    {
        $keys = array_keys($request->validated());

        foreach ($request->validated() as $key => $value) {
            PlatformSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        AuditLog::record($request->user(), 'settings.updated', 'Updated platform settings: '.implode(', ', $keys));

        return response()->json(['ok' => true]);
    }
}
