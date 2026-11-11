<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSmsCredentialRequest;
use App\Http\Requests\Admin\UpdateSmsCredentialRequest;
use App\Http\Resources\SmsCredentialResource;
use App\Models\AuditLog;
use App\Models\SmsCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SmsCredentialController extends Controller
{
    public function index()
    {
        $credentials = SmsCredential::query()->latest()->get();

        return SmsCredentialResource::collection($credentials);
    }

    public function store(StoreSmsCredentialRequest $request)
    {
        $credential = SmsCredential::create([
            ...$request->validated(),
            'is_active' => false,
        ]);

        AuditLog::record($request->user(), 'sms.credential_created', "Added SMS credential \"{$credential->label}\"", $credential);

        return new SmsCredentialResource($credential);
    }

    public function update(UpdateSmsCredentialRequest $request, SmsCredential $smsCredential)
    {
        $data = $request->validated();

        if (array_key_exists('api_key', $data) && empty($data['api_key'])) {
            unset($data['api_key']);
        }

        $smsCredential->update($data);

        return new SmsCredentialResource($smsCredential);
    }

    public function destroy(SmsCredential $smsCredential)
    {
        $smsCredential->delete();

        return response()->json(['ok' => true]);
    }

    /** Only one credential set is ever active — activating one deactivates every other. */
    public function activate(Request $request, SmsCredential $smsCredential)
    {
        DB::transaction(function () use ($smsCredential) {
            SmsCredential::where('id', '!=', $smsCredential->id)->update(['is_active' => false]);
            $smsCredential->update(['is_active' => true]);
        });

        AuditLog::record($request->user(), 'sms.credential_activated', "Activated SMS credential \"{$smsCredential->label}\"", $smsCredential);

        return new SmsCredentialResource($smsCredential->fresh());
    }

    public function deactivate(Request $request, SmsCredential $smsCredential)
    {
        $smsCredential->update(['is_active' => false]);

        AuditLog::record($request->user(), 'sms.credential_deactivated', "Deactivated SMS credential \"{$smsCredential->label}\"", $smsCredential);

        return new SmsCredentialResource($smsCredential);
    }
}
