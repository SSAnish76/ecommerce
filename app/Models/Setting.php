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
    }

    /**
     * Get typed payment gateways configuration settings.
     *
     * @return array{
     *     stripe: array{enabled: bool, publishable_key: string, secret_key: string, webhook_secret: string},
     *     paypal: array{enabled: bool, mode: string, client_id: string, client_secret: string},
     *     cod: array{enabled: bool, instructions: string},
     *     razorpay: array{enabled: bool, key_id: string, key_secret: string, webhook_secret: string}
     * }
     */
    public static function getPaymentSettings(): array
    {
        $default = [
            'stripe' => [
                'enabled' => true,
                'name' => 'Credit / Debit Card (Stripe)',
                'publishable_key' => 'pk_test_sample_stripe_publishable_key',
                'secret_key' => 'sk_test_sample_stripe_secret_key',
                'webhook_secret' => 'whsec_sample_webhook_secret',
            ],
            'paypal' => [
                'enabled' => true,
                'name' => 'PayPal',
                'mode' => 'sandbox',
                'client_id' => 'sample_paypal_client_id',
                'client_secret' => 'sample_paypal_client_secret',
            ],
            'cod' => [
                'enabled' => true,
                'name' => 'Cash on Delivery',
                'instructions' => 'Pay cash to delivery courier on arrival.',
            ],
            'razorpay' => [
                'enabled' => false,
                'name' => 'Razorpay',
                'key_id' => 'rzp_test_sample_key_id',
                'key_secret' => 'sample_razorpay_secret_key',
                'webhook_secret' => 'sample_razorpay_webhook_secret',
            ],
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['payment_settings'] ?? null;
        if (is_array($configured)) {
            $result = [];
            foreach ($default as $key => $def) {
                $result[$key] = array_merge($def, $configured[$key] ?? []);
            }
            foreach ($configured as $key => $conf) {
                if (! isset($result[$key]) && is_array($conf)) {
                    $result[$key] = $conf;
                }
            }

            return $result;
        }

        return $default;
    }

    /**
     * Get typed file storage configuration settings.
     *
     * @return array{
     *     default_disk: string,
     *     s3: array{key: string, secret: string, region: string, bucket: string, url: string, endpoint: string}
     * }
     */
    public static function getStorageSettings(): array
    {
        $default = [
            'default_disk' => 'public',
            's3' => [
                'key' => '',
                'secret' => '',
                'region' => 'us-east-1',
                'bucket' => '',
                'url' => '',
                'endpoint' => '',
            ],
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['storage_settings'] ?? null;
        if (is_array($configured)) {
            return [
                'default_disk' => (string) ($configured['default_disk'] ?? $default['default_disk']),
                's3' => array_merge($default['s3'], $configured['s3'] ?? []),
            ];
        }

        return $default;
    }

    /**
     * Get typed e-commerce shipping configuration settings.
     *
     * @return array{
     *     carrier: array{provider: string, account_number: string, api_key: string, api_secret: string},
     *     fedex: array{enabled: bool, account_number: string, api_key: string, api_secret: string},
     *     ups: array{enabled: bool, account_number: string, api_key: string, api_secret: string},
     *     dhl: array{enabled: bool, account_number: string, api_key: string, api_secret: string}
     * }
     */
    public static function getShippingSettings(): array
    {
        $default = [
            'carrier' => [
                'provider' => 'none',
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
            'fedex' => [
                'enabled' => false,
                'name' => 'FedEx',
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
            'ups' => [
                'enabled' => false,
                'name' => 'UPS',
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
            'dhl' => [
                'enabled' => false,
                'name' => 'DHL Express',
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['shipping_settings'] ?? null;
        if (is_array($configured)) {
            $result = [];
            foreach ($default as $key => $def) {
                $result[$key] = array_merge($def, $configured[$key] ?? []);
            }
            foreach ($configured as $key => $conf) {
                if (! isset($result[$key]) && is_array($conf)) {
                    $result[$key] = $conf;
                }
            }

            return $result;
        }

        return $default;
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
                $pay = $result['payment_settings'];
                $result['payment_stripe_enabled'] ??= (bool) ($pay['stripe']['enabled'] ?? false);
                $result['payment_paypal_enabled'] ??= (bool) ($pay['paypal']['enabled'] ?? false);
                $result['payment_cod_enabled'] ??= (bool) ($pay['cod']['enabled'] ?? false);
                $result['payment_razorpay_enabled'] ??= (bool) ($pay['razorpay']['enabled'] ?? false);
            }

            // Expose shipping carrier aliases
            if (isset($result['shipping_settings']) && is_array($result['shipping_settings'])) {
                $ship = $result['shipping_settings'];
                $result['shipping_fedex_enabled'] ??= (bool) ($ship['fedex']['enabled'] ?? false);
                $result['shipping_ups_enabled'] ??= (bool) ($ship['ups']['enabled'] ?? false);
                $result['shipping_dhl_enabled'] ??= (bool) ($ship['dhl']['enabled'] ?? false);
            }

            // Expose aliases if mail_settings or sms_settings are present so Inertia & consumers seamlessly access them
            if (isset($result['mail_settings']) && is_array($result['mail_settings'])) {
                $mail = $result['mail_settings'];
                $result['mail_host'] ??= $mail['host'] ?? '';
                $result['mail_port'] ??= isset($mail['port']) ? (int) $mail['port'] : 587;
                $result['mail_username'] ??= $mail['username'] ?? '';
                $result['mail_password'] ??= $mail['password'] ?? '';
                $result['mail_encryption'] ??= $mail['encryption'] ?? 'tls';
                $result['mail_from_name'] ??= $mail['from_name'] ?? '';
                $result['mail_from_address'] ??= $mail['from_address'] ?? '';
            }

            if (isset($result['sms_settings']) && is_array($result['sms_settings'])) {
                $sms = $result['sms_settings'];
                $result['sms_provider'] ??= $sms['provider'] ?? 'twilio';
                $result['sms_username'] ??= $sms['username'] ?? '';
                $result['sms_password'] ??= $sms['password'] ?? '';
                $result['sms_from_number'] ??= $sms['from_number'] ?? '';
            }

            // Notification event triggers defaults (Email & SMS independent channels)
            $result['notify_order_placed_customer_email'] ??= true;
            $result['notify_order_placed_customer_sms'] ??= true;
            $result['notify_order_status_updated_email'] ??= true;
            $result['notify_order_status_updated_sms'] ??= true;
            $result['notify_order_delivered_customer_email'] ??= true;
            $result['notify_order_delivered_customer_sms'] ??= true;
            $result['notify_order_cancelled_customer_email'] ??= true;
            $result['notify_order_cancelled_customer_sms'] ??= true;
            $result['notify_new_customer_welcome_email'] ??= true;
            $result['notify_new_customer_welcome_sms'] ??= false;

            $result['notify_order_placed_admin_email'] ??= true;
            $result['notify_order_placed_admin_sms'] ??= false;
            $result['notify_order_cancelled_admin_email'] ??= true;
            $result['notify_order_cancelled_admin_sms'] ??= false;
            $result['notify_low_stock_admin_email'] ??= true;
            $result['notify_low_stock_admin_sms'] ??= false;
            $result['notify_new_review_admin_email'] ??= true;
            $result['notify_new_review_admin_sms'] ??= false;

            // Admin Alert Routing Defaults
            $result['admin_alert_recipient_type'] ??= 'email';
            $result['admin_alert_email'] ??= 'admin@example.com';
            $result['admin_alert_roles'] = is_array($result['admin_alert_roles'] ?? null)
                ? $result['admin_alert_roles']
                : (json_decode((string) ($result['admin_alert_roles'] ?? '[]'), true) ?: []);
            $result['admin_alert_users'] = is_array($result['admin_alert_users'] ?? null)
                ? $result['admin_alert_users']
                : (json_decode((string) ($result['admin_alert_users'] ?? '[]'), true) ?: []);

            $result['menu_delivery_mode'] ??= 'api';

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

            // Ensure core storefront fallback defaults when running in unseeded or fresh environment
            $result['currency_code'] ??= 'USD';
            $result['currency_symbol'] ??= '$';
            $result['currency_decimals'] ??= 2;
            $result['currency_position'] ??= 'left';
            $result['timezone'] ??= (string) config('app.timezone', 'UTC');
            $result['allow_customer_cancellation'] ??= true;
            $result['enable_customer_reviews'] ??= true;
            $result['low_stock_threshold'] ??= 5;
            $result['out_of_stock_visibility'] ??= 'badge';

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
