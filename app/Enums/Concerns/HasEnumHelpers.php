<?php

declare(strict_types=1);

namespace App\Enums\Concerns;

use Illuminate\Support\Str;

trait HasEnumHelpers
{
    /**
     * Get all enum values.
     *
     * @return list<string|int>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get all enum case names.
     *
     * @return list<string>
     */
    public static function names(): array
    {
        return array_column(self::cases(), 'name');
    }

    /**
     * Get user-friendly label.
     * Defaults to humanized case name (e.g. 'PendingPayment' -> 'Pending Payment').
     */
    public function label(): string
    {
        return Str::headline($this->name);
    }

    /**
     * Get key-value pair of [value => label].
     *
     * @return array<string|int, string>
     */
    public static function toArray(): array
    {
        $result = [];

        foreach (self::cases() as $case) {
            $result[$case->value] = $case->label();
        }

        return $result;
    }

    /**
     * Get options list suitable for UI select dropdowns.
     *
     * @return list<array{value: string|int, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
            ],
            self::cases()
        );
    }
}
