<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSmsCredentialRequest extends FormRequest
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
            'label' => ['sometimes', 'string', 'max:255'],
            'partner_id' => ['sometimes', 'string', 'max:255'],
            // Left blank on update to keep the existing key — only overwritten when a new value is sent.
            'api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shortcode' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
