<?php

declare(strict_types=1);

namespace App\Enums\Activity;

use App\Enums\Concerns\HasEnumHelpers;

enum ActivityStatus: string
{
    use HasEnumHelpers;

    case Completed = 'completed';
    case Pending = 'pending';
    case Failed = 'failed';
}
