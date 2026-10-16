<?php

declare(strict_types=1);

namespace App\Traits;

use App\Models\MediaFile;
use App\Services\Storage\MediaStorageService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Trait HasMedia
 *
 * Provides rich media attachment and retrieval capabilities for Eloquent models.
 *
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait HasMedia
{
    /**
     * Boot the trait to automatically handle cascade cleanup if needed.
     */
    public static function bootHasMedia(): void
    {
        static::deleting(function ($model): void {
            if (method_exists($model, 'isForceDeleting') && ! $model->isForceDeleting()) {
                return;
            }

            foreach ($model->media()->get() as $media) {
                $media->delete();
            }
        });
    }

    /**
     * Get all media files attached to this model.
     *
     * @return MorphMany<MediaFile, $this>
     */
    public function media(): MorphMany
    {
        return $this->morphMany(MediaFile::class, 'mediable');
    }

    /**
     * Attach a media file or list of media files by ID, UUID, or model instance.
     *
     * @param int|string|MediaFile|iterable<int|string|MediaFile> $media
     */
    public function attachMedia(
        int|string|MediaFile|iterable $media,
        string $collection = 'default'
    ): void {
        /** @var MediaStorageService $storage */
        $storage = app(MediaStorageService::class);

        $items = is_iterable($media) ? $media : [$media];

        foreach ($items as $item) {
            $storage->attachToModel($item, $this, $collection);
        }
    }

    /**
     * Sync media files for a collection (replaces existing attached media).
     *
     * @param int|string|MediaFile|iterable<int|string|MediaFile> $media
     */
    public function syncMedia(
        int|string|MediaFile|iterable $media,
        string $collection = 'default'
    ): void {
        $this->clearMediaCollection($collection);
        $this->attachMedia($media, $collection);
    }

    /**
     * Get all media belonging to a specific collection.
     *
     * @return Collection<int, MediaFile>
     */
    public function getMedia(string $collection = 'default'): Collection
    {
        return $this->media()
            ->where('collection', $collection)
            ->get();
    }

    /**
     * Get the first media file in a specific collection.
     */
    public function getFirstMedia(string $collection = 'default'): ?MediaFile
    {
        return $this->media()
            ->where('collection', $collection)
            ->latest('created_at')
            ->first();
    }

    /**
     * Get the URL of the first media file in a specific collection, or fallback.
     */
    public function getFirstMediaUrl(string $collection = 'default', ?string $fallback = null): ?string
    {
        $first = $this->getFirstMedia($collection);

        return $first ? $first->url : $fallback;
    }

    /**
     * Get the relative storage path (folder/filename) of the first media file in a specific collection, or fallback.
     */
    public function getFirstMediaPath(string $collection = 'default', ?string $fallback = null): ?string
    {
        $first = $this->getFirstMedia($collection);

        return $first ? $first->path : $fallback;
    }

    /**
     * Detach media from this model by ID or instance.
     */
    public function detachMedia(string|MediaFile $media): bool
    {
        /** @var MediaStorageService $storage */
        $storage = app(MediaStorageService::class);

        return $storage->detachFromModel($media);
    }

    /**
     * Clear all media from a specific collection for this model.
     */
    public function clearMediaCollection(string $collection = 'default'): void
    {
        $this->media()
            ->where('collection', $collection)
            ->get()
            ->each(function (MediaFile $media): void {
                $media->delete();
            });
    }
}
