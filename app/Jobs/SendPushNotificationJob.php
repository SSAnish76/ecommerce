<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Channels\PushChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var list<int>
     */
    public array $backoff = [5, 30, 120];

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public int $timeout = 60;

    /**
     * Create a new job instance.
     *
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public string|int $recipientId,
        public string $title,
        public string $body,
        public array $payload = [],
    ) {
        $this->afterCommit();
    }

    /**
     * Execute the job.
     */
    public function handle(PushChannel $channel): void
    {
        $channel->deliver($this->recipientId, $this->title, $this->body, $this->payload);
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('SendPushNotificationJob failed after exhausting all retry attempts.', [
            'recipient' => $this->recipientId,
            'title' => $this->title,
            'error' => $exception?->getMessage(),
        ]);
    }
}
