<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSavedLocationRequest;
use App\Http\Requests\UpdateSavedLocationRequest;
use App\Http\Resources\SavedLocationResource;
use App\Models\SavedLocation;
use Illuminate\Http\Request;

class SavedLocationController extends Controller
{
    public function index(Request $request)
    {
        $locations = $request->user()->savedLocations()
            ->with(['county', 'subcounty', 'ward'])
            ->orderByDesc('is_default')
            ->orderBy('label')
            ->get();

        return SavedLocationResource::collection($locations);
    }

    public function store(StoreSavedLocationRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();

        if ($data['is_default'] ?? false) {
            $user->savedLocations()->update(['is_default' => false]);
        }

        $location = $user->savedLocations()->create($data);

        return new SavedLocationResource($location->load(['county', 'subcounty', 'ward']));
    }

    public function update(UpdateSavedLocationRequest $request, SavedLocation $savedLocation)
    {
        abort_unless($savedLocation->user_id === $request->user()->id, 404);

        $data = $request->validated();

        if ($data['is_default'] ?? false) {
            $request->user()->savedLocations()->where('id', '!=', $savedLocation->id)->update(['is_default' => false]);
        }

        $savedLocation->update($data);

        return new SavedLocationResource($savedLocation->load(['county', 'subcounty', 'ward']));
    }

    public function destroy(Request $request, SavedLocation $savedLocation)
    {
        abort_unless($savedLocation->user_id === $request->user()->id, 404);

        $savedLocation->delete();

        return response()->json(['ok' => true]);
    }
}
