<?php

declare(strict_types=1);

namespace App\Services\Channels;

interface ChannelInterface
{
    /**
     * Get the unique identifier for this notification channel.
     */
    public function name(): string;

    /**
     * Determine whether the channel is currently enabled.
     */
    public function isEnabled(?string $settingKey = null): bool;
}
