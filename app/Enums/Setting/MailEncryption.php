<?php

declare(strict_types=1);

namespace App\Enums\Setting;

use App\Enums\Concerns\HasEnumHelpers;

enum MailEncryption: string
{
    use HasEnumHelpers;

    case Tls = 'tls';
    case Ssl = 'ssl';
    case None = 'none';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Tls => 'TLS (587)',
            self::Ssl => 'SSL (465)',
            self::None => 'None (25)',
        };
    }
}
