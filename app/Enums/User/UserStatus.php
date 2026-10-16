<?php

declare(strict_types=1);

namespace App\Enums\User;

use App\Enums\Concerns\HasEnumHelpers;

enum UserStatus: string
{
    use HasEnumHelpers;

    case Active = 'active';
    case Inactive = 'inactive';
}
