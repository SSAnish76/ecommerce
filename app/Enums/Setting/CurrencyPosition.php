<?php

declare(strict_types=1);

namespace App\Enums\Setting;

use App\Enums\Concerns\HasEnumHelpers;

enum CurrencyPosition: string
{
    use HasEnumHelpers;

    case Prefix = 'prefix';
    case Suffix = 'suffix';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Prefix => 'Prefix (e.g. $100.00)',
            self::Suffix => 'Suffix (e.g. 100.00 $)',
        };
    }
}
