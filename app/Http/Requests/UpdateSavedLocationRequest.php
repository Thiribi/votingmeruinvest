<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSavedLocationRequest extends FormRequest
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
        $countyId = $this->input('county_id', $this->route('savedLocation')?->county_id);

        return [
            'label' => ['nullable', 'string', 'max:80'],
            'county_id' => ['sometimes', 'exists:counties,id'],
            'subcounty_id' => [
                'nullable',
                Rule::exists('subcounties', 'id')->where('county_id', $countyId),
            ],
            'ward_id' => [
                'nullable',
                Rule::exists('wards', 'id')->where('subcounty_id', $this->input('subcounty_id')),
            ],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
