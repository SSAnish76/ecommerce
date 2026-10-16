<?php

declare(strict_types=1);

namespace App\Enums\Menu;

use App\Enums\Concerns\HasEnumHelpers;

enum MenuStatus: string
{
    use HasEnumHelpers;

    case Active = 'active';
    case Inactive = 'inactive';
}
