<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Storage\MediaStorageService;
use Illuminate\Console\Command;

class PruneUnattachedMediaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:prune-unattached {--hours=24 : Age in hours for unattached media to be pruned}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune orphaned and temporary media files that were never attached to any model';

    /**
     * Execute the console command.
     */
    public function handle(MediaStorageService $storage): int
    {
        $hours = (int) $this->option('hours');

        $this->info("Pruning unattached media files older than {$hours} hours...");

        $deletedCount = $storage->pruneUnattached($hours);

        $this->info("Successfully pruned {$deletedCount} unattached media file(s).");

        return self::SUCCESS;
    }
}
