<?php

declare(strict_types=1);

namespace App\Enums\Store;

use App\Enums\Concerns\HasEnumHelpers;

enum StoreStatus: string
{
    use HasEnumHelpers;

    case Active = 'active';
    case Inactive = 'inactive';
}
