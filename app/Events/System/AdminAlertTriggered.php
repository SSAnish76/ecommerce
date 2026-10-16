<?php

declare(strict_types=1);

namespace App\Events\System;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AdminAlertTriggered implements ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @param array<string, mixed> $context
     */
    public function __construct(
        public string $subject,
        public string $message,
        public array $context = [],
        public string $level = 'info',
    ) {}
}
