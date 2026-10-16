<?php

declare(strict_types=1);

namespace App\Enums\Setting;

use App\Enums\Concerns\HasEnumHelpers;

enum MailDriver: string
{
    use HasEnumHelpers;

    case Smtp = 'smtp';
    case Sendmail = 'sendmail';
    case Log = 'log';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Smtp => 'SMTP (Recommended)',
            self::Sendmail => 'Sendmail',
            self::Log => 'Log (Testing)',
        };
    }
}
