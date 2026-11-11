<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSavedLocationRequest extends FormRequest
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
            'label' => ['nullable', 'string', 'max:80'],
            'county_id' => ['required', 'exists:counties,id'],
            'subcounty_id' => [
                'nullable',
                Rule::exists('subcounties', 'id')->where('county_id', $this->input('county_id')),
            ],
            'ward_id' => [
                'nullable',
                Rule::exists('wards', 'id')->where('subcounty_id', $this->input('subcounty_id')),
            ],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
