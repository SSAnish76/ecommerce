<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class Setting extends Model
{
    use HasFactory;

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'key';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'value',
        'group',
        'type',
        'label',
        'description',
        'is_public',
    ];

    /**
     * Cache key for settings.
     */
    public const CACHE_KEY = 'app_settings_all';

    /**
     * Cache key for public storefront settings.
     */
    public const PUBLIC_CACHE_KEY = 'app_settings_public';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
        ];
    }

    /**
     * Encrypt a sensitive credential string with 'enc:' prefix.
     */
    public static function encryptSensitive(mixed $value): string
    {
        if (! is_string($value) || $value === '' || str_starts_with($value, 'enc:')) {
            return (string) $value;
        }

        try {
            return 'enc:'.Crypt::encryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    /**
     * Decrypt an encrypted credential string prefixed with 'enc:'.
     */
    public static function decryptSensitive(mixed $value): string
    {
        if (! is_string($value) || ! str_starts_with($value, 'enc:')) {
            return (string) $value;
        }

        try {
            return Crypt::decryptString(substr($value, 4));
        } catch (\Throwable) {
            return $value;
        }
    }

    /**
     * Check if a setting attribute or key name represents sensitive credentials.
     */
    public static function isSensitiveKey(string $key): bool
    {
        $lower = strtolower($key);

        return in_array($lower, [
            'password',
            'secret',
            'secret_key',
            'stripe_secret',
            'stripe_secret_key',
            'stripe_webhook_secret',
            'paypal_client_secret',
            'aws_secret_access_key',
            'carrier_api_secret',
            'auth_token',
            'api_secret',
        ], true)
            || str_ends_with($lower, '_secret')
            || str_ends_with($lower, '_password')
            || str_ends_with($lower, '_token');
    }

    /**
     * Recursively encrypt sensitive keys inside nested setting arrays.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function encryptSensitiveFields(array $data): array
    {
        foreach ($data as $key => $val) {
            if (is_array($val)) {
                $data[$key] = static::encryptSensitiveFields($val);
            } elseif (is_string($val) && $val !== '' && static::isSensitiveKey((string) $key)) {
                $data[$key] = static::encryptSensitive($val);
            }
        }

        return $data;
    }

    /**
     * Recursively decrypt sensitive keys inside nested setting arrays.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function decryptSensitiveFields(array $data): array
    {
        foreach ($data as $key => $val) {
            if (is_array($val)) {
                $data[$key] = static::decryptSensitiveFields($val);
            } elseif (is_string($val) && str_starts_with($val, 'enc:')) {
                $data[$key] = static::decryptSensitive($val);
            }
        }

        return $data;
    }

    /**
     * Cast the raw value according to type and decrypt sensitive data if applicable.
     */
    public function getCastValue(): mixed
    {
        if ($this->value === null) {
            return null;
        }

        return match ($this->type) {
            'boolean', 'bool' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'integer', 'int' => (int) $this->value,
            'float', 'double' => (float) $this->value,
            'json', 'array' => static::decryptSensitiveFields(json_decode((string) $this->value, true) ?: []),
            default => str_starts_with((string) $this->value, 'enc:') ? static::decryptSensitive((string) $this->value) : (string) $this->value,
        };
    }

    /**
     * Get a setting by key with a fallback default.
     * Supports dot-notation (e.g. 'mail_settings.host') and backward-compatible aliases.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        try {
            /** @var array<string, mixed> $all */
            $all = static::getAllKeyValues();

            if (array_key_exists($key, $all)) {
                return $all[$key];
            }

            // Support dot notation: e.g. Setting::get('mail_settings.host')
            if (str_contains($key, '.')) {
                return data_get($all, $key, $default);
            }

            return $default;
        } catch (Throwable) {
            return $default;
        }
    }

    /**
     * Get typed payment gateways configuration settings from the database.
     *
     * @return array<string, mixed>
     */
    public static function getPaymentSettings(): array
    {
        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['payment_settings'] ?? null;

        return is_array($configured) ? $configured : [];
    }

    /**
     * Get typed file storage configuration settings from the database.
     *
     * @return array<string, mixed>
     */
    public static function getStorageSettings(): array
    {
        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['storage_settings'] ?? null;

        return is_array($configured) ? $configured : [
            'default_disk' => 'public',
        ];
    }

    /**
     * Get typed e-commerce shipping configuration settings from the database.
     *
     * @return array<string, mixed>
     */
    public static function getShippingSettings(): array
    {
        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['shipping_settings'] ?? null;

        return is_array($configured) ? $configured : [];
    }

    /**
     * Get typed mail configuration settings.
     *
     * @return array{
     *     host: string,
     *     port: int,
     *     username: string,
     *     password: string,
     *     encryption: string,
     *     from_name: string,
     *     from_address: string
     * }
     */
    public static function getMailSettings(): array
    {
        $default = [
            'host' => 'smtp.mailtrap.io',
            'port' => 587,
            'username' => '',
            'password' => '',
            'encryption' => 'tls',
            'from_name' => 'E-Commerce Store',
            'from_address' => 'notifications@example.com',
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['mail_settings'] ?? null;
        if (is_array($configured)) {
            return array_merge($default, $configured);
        }

        return $default;
    }

    /**
     * Get typed SMS gateway configuration settings.
     *
     * @return array{
     *     provider: string,
     *     username: string,
     *     password: string,
     *     from_number: string
     * }
     */
    public static function getSmsSettings(): array
    {
        $default = [
            'provider' => 'twilio',
            'username' => '',
            'password' => '',
            'from_number' => '',
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['sms_settings'] ?? null;
        if (is_array($configured)) {
            return array_merge($default, $configured);
        }

        return $default;
    }

    /**
     * Set a setting value by key.
     */
    public static function set(string $key, mixed $value, ?string $group = 'general', ?string $type = null): self
    {
        if ($type === null) {
            $type = match (true) {
                is_bool($value) => 'boolean',
                is_int($value) => 'integer',
                is_float($value) => 'float',
                is_array($value) => 'json',
                default => 'string',
            };
        }

        $serializedValue = match ($type) {
            'boolean', 'bool' => $value ? '1' : '0',
            'json', 'array' => is_array($value)
                ? json_encode(static::encryptSensitiveFields($value))
                : (is_string($value) ? $value : json_encode($value)),
            default => static::isSensitiveKey($key)
                ? static::encryptSensitive((string) $value)
                : (string) $value,
        };

        /** @var Setting $setting */
        $setting = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $serializedValue,
                'group' => $group ?? 'general',
                'type' => $type,
            ]
        );

        Cache::forget(self::CACHE_KEY);

        return $setting;
    }

    /**
     * Batch update multiple settings in a single transaction.
     *
     * @param array<string, mixed> $settings
     */
    public static function setMany(array $settings, ?string $group = 'general'): void
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($settings, $group): void {
            foreach ($settings as $key => $value) {
                $type = match (true) {
                    is_bool($value) => 'boolean',
                    is_int($value) => 'integer',
                    is_float($value) => 'float',
                    is_array($value) => 'json',
                    default => 'string',
                };

                $serializedValue = match ($type) {
                    'boolean', 'bool' => $value ? '1' : '0',
                    'json', 'array' => is_array($value)
                        ? json_encode(static::encryptSensitiveFields($value))
                        : (is_string($value) ? $value : json_encode($value)),
                    default => static::isSensitiveKey($key)
                        ? static::encryptSensitive((string) $value)
                        : (string) $value,
                };

                $existing = static::query()->where('key', $key)->first();
                $targetGroup = $existing?->group ?? $group ?? 'general';

                static::query()->updateOrCreate(
                    ['key' => $key],
                    [
                        'value' => $serializedValue,
                        'group' => $targetGroup,
                        'type' => $type,
                    ]
                );
            }
        });

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Get all settings as key => cast value pairs.
     *
     * @return array<string, mixed>
     */
    public static function getAllKeyValues(): array
    {
        return Cache::remember(self::CACHE_KEY, 3600, function (): array {
            $settings = static::all();
            $result = [];

            foreach ($settings as $setting) {
                $result[$setting->key] = $setting->getCastValue();
            }

            // Expose aliases if payment_settings is present so Inertia & consumers seamlessly access them
            if (isset($result['payment_settings']) && is_array($result['payment_settings'])) {
                foreach ($result['payment_settings'] as $code => $config) {
                    if (is_array($config) && isset($config['enabled'])) {
                        $result["payment_{$code}_enabled"] ??= (bool) $config['enabled'];
                    }
                }
            }

            // Expose shipping carrier aliases
            if (isset($result['shipping_settings']) && is_array($result['shipping_settings'])) {
                foreach ($result['shipping_settings'] as $code => $config) {
                    if (is_array($config)) {
                        if (isset($config['enabled'])) {
                            $result["shipping_{$code}_enabled"] ??= (bool) $config['enabled'];
                        }
                        if ($code === 'flat_rate' && isset($config['cost'])) {
                            $result['shipping_flat_rate_cost'] ??= $config['cost'];
                        }
                        if ($code === 'free_shipping' && isset($config['min_amount'])) {
                            $result['shipping_free_shipping_min_order'] ??= $config['min_amount'];
                        }
                    }
                }
            }

            // Expose aliases if mail_settings or sms_settings are present so Inertia & consumers seamlessly access them
            if (isset($result['mail_settings']) && is_array($result['mail_settings'])) {
                foreach ($result['mail_settings'] as $key => $val) {
                    $result["mail_{$key}"] ??= $val;
                }
            }

            if (isset($result['sms_settings']) && is_array($result['sms_settings'])) {
                foreach ($result['sms_settings'] as $key => $val) {
                    $result["sms_{$key}"] ??= $val;
                }
            }

            return $result;
        });
    }

    /**
     * Get all public settings as key => cast value pairs for customer/storefront use.
     *
     * @return array<string, mixed>
     */
    public static function getPublicSettings(): array
    {
        return Cache::remember(self::PUBLIC_CACHE_KEY, 3600, function (): array {
            $settings = static::query()->where('is_public', true)->get();
            $result = [];

            foreach ($settings as $setting) {
                $result[$setting->key] = $setting->getCastValue();
            }

            return $result;
        });
    }

    /**
     * Clear settings cache.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::PUBLIC_CACHE_KEY);
        Cache::forget('app_essentials_data');
    }
}
