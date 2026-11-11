<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
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
            'platform_name' => ['sometimes', 'string', 'max:255'],
            'support_email' => ['sometimes', 'email', 'max:255'],
            'require_dual_otp' => ['sometimes', 'boolean'],
            'mpesa_enabled' => ['sometimes', 'boolean'],
            'mpesa_shortcode' => ['sometimes', 'nullable', 'string', 'max:255'],
            'fraud_auto_review' => ['sometimes', 'boolean'],
            'max_votes_per_ip' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
