<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CartCheckoutRequest extends FormRequest
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
            'mpesa_phone' => ['nullable', 'string'],
            'county_id' => ['nullable', 'exists:counties,id'],
            'subcounty_id' => [
                'nullable',
                Rule::exists('subcounties', 'id')->where('county_id', $this->input('county_id')),
            ],
            'ward_id' => [
                'nullable',
                Rule::exists('wards', 'id')->where('subcounty_id', $this->input('subcounty_id')),
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
