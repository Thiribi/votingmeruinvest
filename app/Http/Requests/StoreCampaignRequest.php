<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCampaignRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
            'category' => ['nullable', 'string', 'max:255'],
            'visibility' => ['required', 'in:public,private'],
            'starts_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'feedback_options' => ['nullable', 'array', 'max:10'],
            'feedback_options.*' => ['string', 'max:120'],
            'allowed_emails' => ['nullable', 'array'],
            'allowed_emails.*' => ['email'],
            'options' => ['required', 'array', 'min:2'],
            'options.*.label' => ['required', 'string', 'max:255'],
            'options.*.description' => ['nullable', 'string'],
        ];
    }
}
