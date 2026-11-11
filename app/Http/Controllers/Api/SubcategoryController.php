<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubcategoryRequest;
use App\Http\Requests\UpdateSubcategoryRequest;
use App\Http\Resources\SubcategoryResource;
use App\Models\Category;
use App\Models\Subcategory;
use App\Services\SeasonService;
use Illuminate\Support\Str;

class SubcategoryController extends Controller
{
    public function __construct(private readonly SeasonService $seasons)
    {
    }

    public function store(StoreSubcategoryRequest $request, Category $category)
    {
        $data = $request->validated();

        $data['category_id'] = $category->id;
        $data['slug'] = Str::slug($data['name']);
        $data['is_active'] = $data['is_active'] ?? true;

        $subcategory = Subcategory::create($data);
        $this->seasons->currentPeriod($subcategory);

        return new SubcategoryResource($subcategory);
    }

    public function update(UpdateSubcategoryRequest $request, Subcategory $subcategory)
    {
        $data = $request->validated();

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $subcategory->update($data);
        $this->seasons->currentPeriod($subcategory);

        return new SubcategoryResource($subcategory);
    }

    public function archive(Subcategory $subcategory)
    {
        $subcategory->archive();

        return new SubcategoryResource($subcategory);
    }

    public function unarchive(Subcategory $subcategory)
    {
        $subcategory->unarchive();

        return new SubcategoryResource($subcategory);
    }

    public function destroy(Subcategory $subcategory)
    {
        $subcategory->delete();

        return response()->json(['ok' => true]);
    }
}
