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
    ];

    /**
     * Cache key for settings.
     */
    public const CACHE_KEY = 'app_settings_all';

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

        // Backward compatibility mappings for legacy individual mail_* keys
        $mailMap = [
            'mail_host' => 'host',
            'mail_port' => 'port',
            'mail_username' => 'username',
            'mail_password' => 'password',
            'mail_encryption' => 'encryption',
            'mail_from_name' => 'from_name',
            'mail_from_address' => 'from_address',
        ];

        if (isset($mailMap[$key]) && isset($all['mail_settings']) && is_array($all['mail_settings'])) {
            return $all['mail_settings'][$mailMap[$key]] ?? $default;
        }

        // Backward compatibility mappings for legacy individual sms_* keys
        $smsMap = [
            'sms_provider' => 'provider',
            'sms_username' => 'username',
            'sms_password' => 'password',
            'sms_from_number' => 'from_number',
        ];

        if (isset($smsMap[$key]) && isset($all['sms_settings']) && is_array($all['sms_settings'])) {
            return $all['sms_settings'][$smsMap[$key]] ?? $default;
        }

        // Backward compatibility mappings for legacy payment_* keys
        $paymentMap = [
            'payment_stripe_enabled' => 'stripe.enabled',
            'payment_paypal_enabled' => 'paypal.enabled',
            'payment_cod_enabled' => 'cod.enabled',
            'payment_razorpay_enabled' => 'razorpay.enabled',
        ];

        if (isset($paymentMap[$key]) && isset($all['payment_settings']) && is_array($all['payment_settings'])) {
            return data_get($all['payment_settings'], $paymentMap[$key], $default);
        }

        // Backward compatibility mappings for shipping_* carrier keys
        $shippingMap = [
            'shipping_fedex_enabled' => 'fedex.enabled',
            'shipping_ups_enabled' => 'ups.enabled',
            'shipping_dhl_enabled' => 'dhl.enabled',
        ];

        if (isset($shippingMap[$key]) && isset($all['shipping_settings']) && is_array($all['shipping_settings'])) {
            return data_get($all['shipping_settings'], $shippingMap[$key], $default);
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
                'publishable_key' => 'pk_test_sample_stripe_publishable_key',
                'secret_key' => 'sk_test_sample_stripe_secret_key',
                'webhook_secret' => 'whsec_sample_webhook_secret',
            ],
            'paypal' => [
                'enabled' => true,
                'mode' => 'sandbox',
                'client_id' => 'sample_paypal_client_id',
                'client_secret' => 'sample_paypal_client_secret',
            ],
            'cod' => [
                'enabled' => true,
                'instructions' => 'Pay cash to delivery courier on arrival.',
            ],
            'razorpay' => [
                'enabled' => false,
                'key_id' => 'rzp_test_sample_key_id',
                'key_secret' => 'sample_razorpay_secret_key',
                'webhook_secret' => 'sample_razorpay_webhook_secret',
            ],
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['payment_settings'] ?? null;
        if (is_array($configured)) {
            return [
                'stripe' => array_merge($default['stripe'], $configured['stripe'] ?? []),
                'paypal' => array_merge($default['paypal'], $configured['paypal'] ?? []),
                'cod' => array_merge($default['cod'], $configured['cod'] ?? []),
                'razorpay' => array_merge($default['razorpay'], $configured['razorpay'] ?? []),
            ];
        }

        return [
            'stripe' => [
                'enabled' => (bool) ($all['payment_stripe_enabled'] ?? $default['stripe']['enabled']),
                'publishable_key' => (string) ($all['payment_stripe_publishable_key'] ?? $default['stripe']['publishable_key']),
                'secret_key' => (string) ($all['payment_stripe_secret_key'] ?? $default['stripe']['secret_key']),
                'webhook_secret' => (string) ($all['payment_stripe_webhook_secret'] ?? $default['stripe']['webhook_secret']),
            ],
            'paypal' => [
                'enabled' => (bool) ($all['payment_paypal_enabled'] ?? $default['paypal']['enabled']),
                'mode' => (string) ($all['payment_paypal_mode'] ?? $default['paypal']['mode']),
                'client_id' => (string) ($all['payment_paypal_client_id'] ?? $default['paypal']['client_id']),
                'client_secret' => (string) ($all['payment_paypal_client_secret'] ?? $default['paypal']['client_secret']),
            ],
            'cod' => [
                'enabled' => (bool) ($all['payment_cod_enabled'] ?? $default['cod']['enabled']),
                'instructions' => (string) ($all['payment_cod_instructions'] ?? $default['cod']['instructions']),
            ],
            'razorpay' => [
                'enabled' => (bool) ($all['payment_razorpay_enabled'] ?? $default['razorpay']['enabled']),
                'key_id' => (string) ($all['payment_razorpay_key_id'] ?? $default['razorpay']['key_id']),
                'key_secret' => (string) ($all['payment_razorpay_key_secret'] ?? $default['razorpay']['key_secret']),
                'webhook_secret' => (string) ($all['payment_razorpay_webhook_secret'] ?? $default['razorpay']['webhook_secret']),
            ],
        ];
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
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
            'ups' => [
                'enabled' => false,
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
            'dhl' => [
                'enabled' => false,
                'account_number' => '',
                'api_key' => '',
                'api_secret' => '',
            ],
        ];

        /** @var array<string, mixed> $all */
        $all = static::getAllKeyValues();

        $configured = $all['shipping_settings'] ?? null;
        if (is_array($configured)) {
            $legacyCarrier = $configured['carrier'] ?? $default['carrier'];
            $legacyProvider = $legacyCarrier['provider'] ?? 'none';

            $fedex = array_merge($default['fedex'], $configured['fedex'] ?? []);
            if (! isset($configured['fedex']) && $legacyProvider === 'fedex') {
                $fedex['enabled'] = true;
                $fedex['account_number'] = $legacyCarrier['account_number'] ?? '';
                $fedex['api_key'] = $legacyCarrier['api_key'] ?? '';
                $fedex['api_secret'] = $legacyCarrier['api_secret'] ?? '';
            }

            $ups = array_merge($default['ups'], $configured['ups'] ?? []);
            if (! isset($configured['ups']) && $legacyProvider === 'ups') {
                $ups['enabled'] = true;
                $ups['account_number'] = $legacyCarrier['account_number'] ?? '';
                $ups['api_key'] = $legacyCarrier['api_key'] ?? '';
                $ups['api_secret'] = $legacyCarrier['api_secret'] ?? '';
            }

            $dhl = array_merge($default['dhl'], $configured['dhl'] ?? []);
            if (! isset($configured['dhl']) && $legacyProvider === 'dhl') {
                $dhl['enabled'] = true;
                $dhl['account_number'] = $legacyCarrier['account_number'] ?? '';
                $dhl['api_key'] = $legacyCarrier['api_key'] ?? '';
                $dhl['api_secret'] = $legacyCarrier['api_secret'] ?? '';
            }

            $activeProvider = $fedex['enabled'] ? 'fedex' : ($ups['enabled'] ? 'ups' : ($dhl['enabled'] ? 'dhl' : $legacyProvider));
            $activeCarrierData = match ($activeProvider) {
                'fedex' => $fedex,
                'ups' => $ups,
                'dhl' => $dhl,
                default => $legacyCarrier,
            };

            return [
                'carrier' => [
                    'provider' => $activeProvider,
                    'account_number' => $activeCarrierData['account_number'] ?? '',
                    'api_key' => $activeCarrierData['api_key'] ?? '',
                    'api_secret' => $activeCarrierData['api_secret'] ?? '',
                ],
                'fedex' => $fedex,
                'ups' => $ups,
                'dhl' => $dhl,
            ];
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

        return [
            'host' => (string) ($all['mail_host'] ?? $default['host']),
            'port' => isset($all['mail_port']) ? (int) $all['mail_port'] : $default['port'],
            'username' => (string) ($all['mail_username'] ?? $default['username']),
            'password' => (string) ($all['mail_password'] ?? $default['password']),
            'encryption' => (string) ($all['mail_encryption'] ?? $default['encryption']),
            'from_name' => (string) ($all['mail_from_name'] ?? $default['from_name']),
            'from_address' => (string) ($all['mail_from_address'] ?? $default['from_address']),
        ];
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

        return [
            'provider' => (string) ($all['sms_provider'] ?? $default['provider']),
            'username' => (string) ($all['sms_username'] ?? $default['username']),
            'password' => (string) ($all['sms_password'] ?? $default['password']),
            'from_number' => (string) ($all['sms_from_number'] ?? $default['from_number']),
        ];
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

            // Expose aliases if payment_settings is present so Inertia & legacy consumers seamlessly access them
            if (isset($result['payment_settings']) && is_array($result['payment_settings'])) {
                $pay = $result['payment_settings'];
                $result['payment_stripe_enabled'] ??= (bool) ($pay['stripe']['enabled'] ?? false);
                $result['payment_paypal_enabled'] ??= (bool) ($pay['paypal']['enabled'] ?? false);
                $result['payment_cod_enabled'] ??= (bool) ($pay['cod']['enabled'] ?? false);
                $result['payment_bank_transfer_enabled'] ??= (bool) ($pay['bank_transfer']['enabled'] ?? false);
            }

            // Expose aliases if mail_settings or sms_settings are present so Inertia & legacy consumers seamlessly access them
            if (isset($result['mail_settings']) && is_array($result['mail_settings'])) {
                $mail = $result['mail_settings'];
                $result['mail_mailer'] ??= $mail['mailer'] ?? 'smtp';
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

            return $result;
        });
    }

    /**
     * Clear settings cache.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
