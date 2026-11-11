<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCampaignRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
            'category' => ['nullable', 'string', 'max:255'],
            'visibility' => ['sometimes', 'in:public,private'],
            'status' => ['sometimes', 'in:draft,live,closed'],
            'starts_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }
}
