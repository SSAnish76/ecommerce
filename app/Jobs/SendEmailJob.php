<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Channels\EmailChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendEmailJob implements ShouldQueue
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
     * @param string|list<string> $to
     */
    public function __construct(
        public string|array $to,
        public Mailable $mailable,
    ) {
        $this->afterCommit();
    }

    /**
     * Execute the job.
     */
    public function handle(EmailChannel $channel): void
    {
        $channel->deliver($this->to, $this->mailable);
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('SendEmailJob failed after exhausting all retry attempts.', [
            'recipient' => $this->to,
            'mailable' => get_class($this->mailable),
            'error' => $exception?->getMessage(),
            'trace' => $exception?->getTraceAsString(),
        ]);
    }
}
