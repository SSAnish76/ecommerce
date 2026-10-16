<?php

declare(strict_types=1);

namespace App\Support;

class Constants
{
    /**
     * Vital system permissions that cannot be deleted or revoked.
     *
     * @var list<string>
     */
    public const VITAL_PERMISSIONS = [
        'dashboard.view',
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.roles',
        'security.manage',
    ];

    /**
     * Standard timezones used across the e-commerce platform.
     *
     * @return array<string, string>
     */
    public static function timezones(): array
    {
        return [
            'UTC' => '(UTC) Coordinated Universal Time',
            'America/New_York' => '(UTC-05:00) Eastern Time (US & Canada)',
            'America/Chicago' => '(UTC-06:00) Central Time (US & Canada)',
            'America/Denver' => '(UTC-07:00) Mountain Time (US & Canada)',
            'America/Los_Angeles' => '(UTC-08:00) Pacific Time (US & Canada)',
            'Europe/London' => '(UTC+00:00) London, Edinburgh, Dublin',
            'Europe/Paris' => '(UTC+01:00) Paris, Berlin, Rome, Madrid',
            'Europe/Moscow' => '(UTC+03:00) Moscow, St. Petersburg',
            'Asia/Dubai' => '(UTC+04:00) Abu Dhabi, Muscat, Dubai',
            'Asia/Kolkata' => '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
            'Asia/Singapore' => '(UTC+08:00) Singapore, Kuala Lumpur',
            'Asia/Tokyo' => '(UTC+09:00) Tokyo, Osaka, Sapporo',
            'Australia/Sydney' => '(UTC+10:00) Sydney, Melbourne',
        ];
    }

    /**
     * Standard supported currencies with ISO code, visual symbol, and title.
     *
     * @return list<array{code: string, symbol: string, name: string}>
     */
    public static function currencies(): array
    {
        return [
            ['code' => 'USD', 'symbol' => '$', 'name' => 'United States Dollar (USD)'],
            ['code' => 'EUR', 'symbol' => '€', 'name' => 'Euro (EUR)'],
            ['code' => 'GBP', 'symbol' => '£', 'name' => 'British Pound Sterling (GBP)'],
            ['code' => 'INR', 'symbol' => '₹', 'name' => 'Indian Rupee (INR)'],
            ['code' => 'CAD', 'symbol' => 'CA$', 'name' => 'Canadian Dollar (CAD)'],
            ['code' => 'AUD', 'symbol' => 'A$', 'name' => 'Australian Dollar (AUD)'],
            ['code' => 'JPY', 'symbol' => '¥', 'name' => 'Japanese Yen (JPY)'],
            ['code' => 'AED', 'symbol' => 'AED', 'name' => 'United Arab Emirates Dirham (AED)'],
            ['code' => 'SGD', 'symbol' => 'S$', 'name' => 'Singapore Dollar (SGD)'],
        ];
    }

    /**
     * Associative key-value map of currencies for select dropdowns.
     *
     * @return array<string, string>
     */
    public static function currenciesMap(): array
    {
        $map = [];
        foreach (self::currencies() as $curr) {
            $map[$curr['code']] = "{$curr['name']} - {$curr['symbol']}";
        }

        return $map;
    }

    /**
     * Standard date display formatting options.
     *
     * @return array<string, string>
     */
    public static function dateFormats(): array
    {
        return [
            'Y-m-d' => 'YYYY-MM-DD (2026-10-14)',
            'm/d/Y' => 'MM/DD/YYYY (10/14/2026)',
            'd/m/Y' => 'DD/MM/YYYY (14/10/2026)',
            'M j, Y' => 'Mon D, YYYY (Oct 14, 2026)',
        ];
    }

    /**
     * Standard time display formatting options.
     *
     * @return array<string, string>
     */
    public static function timeFormats(): array
    {
        return [
            'h:i A' => '12-Hour (02:30 PM)',
            'H:i' => '24-Hour (14:30)',
        ];
    }

    /**
     * Return list of vital system permissions.
     *
     * @return list<string>
     */
    public static function vitalPermissions(): array
    {
        return self::VITAL_PERMISSIONS;
    }
}
