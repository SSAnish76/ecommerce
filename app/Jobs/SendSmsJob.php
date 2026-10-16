<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendSmsJob implements ShouldQueue
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
     */
    public function __construct(
        public string $to,
        public string $message,
    ) {
        $this->afterCommit();
    }

    /**
     * Execute the job.
     */
    public function handle(SmsChannel $channel): void
    {
        $channel->deliver($this->to, $this->message);
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('SendSmsJob failed after exhausting all retry attempts.', [
            'to' => $this->to,
            'message' => $this->message,
            'error' => $exception?->getMessage(),
        ]);
    }
}
