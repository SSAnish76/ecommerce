<?php

declare(strict_types=1);

namespace App\Enums\Setting;

use App\Enums\Concerns\HasEnumHelpers;

enum SmsProvider: string
{
    use HasEnumHelpers;

    case Twilio = 'twilio';
    case Vonage = 'vonage';
    case AwsSns = 'aws_sns';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Twilio => 'Twilio Programmable Messaging',
            self::Vonage => 'Vonage (formerly Nexmo)',
            self::AwsSns => 'Amazon Web Services (AWS SNS)',
        };
    }
}
