<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\Archivable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Archivable, HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'organization_id',
        'name',
        'first_name',
        'last_name',
        'email',
        'phone',
        'avatar_url',
        'user_classification',
        'role',
        'mpesa_phone',
        'latitude',
        'longitude',
        'location_captured_at',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'verified_at' => 'datetime',
            'location_captured_at' => 'datetime',
            'suspended_at' => 'datetime',
            'deletion_requested_at' => 'datetime',
            'archived_at' => 'datetime',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'password' => 'hashed',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function savedLocations(): HasMany
    {
        return $this->hasMany(SavedLocation::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    /** Direct grants plus everything inherited from assigned roles. */
    public function hasPermission(string $name): bool
    {
        return $this->permissions()->where('name', $name)->exists()
            || $this->roles()->whereHas('permissions', fn ($q) => $q->where('name', $name))->exists();
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }
}
