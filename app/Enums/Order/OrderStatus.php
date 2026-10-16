<?php

declare(strict_types=1);

namespace App\Enums\Order;

use App\Enums\Concerns\HasEnumHelpers;

enum OrderStatus: string
{
    use HasEnumHelpers;

    case Delivered = 'Delivered';
    case Processing = 'Processing';
    case Shipped = 'Shipped';
    case Cancelled = 'Cancelled';
}
