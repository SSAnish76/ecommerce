<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Storage\MediaStorageService;
use Database\Factories\MediaFileFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property string $id
 * @property string $disk
 * @property string $directory
 * @property string $filename
 * @property string $original_name
 * @property string $mime_type
 * @property string $extension
 * @property int $size
 * @property string|null $hash
 * @property string $collection
 * @property string|null $user_id
 * @property string|null $mediable_type
 * @property string|null $mediable_id
 * @property array<string, mixed>|null $meta
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $url
 * @property-read string $path
 * @property-read string $human_size
 * @property-read bool $is_image
 * @property-read bool $is_attached
 */
class MediaFile extends Model
{
    /** @use HasFactory<MediaFileFactory> */
    use HasFactory, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'disk',
        'directory',
        'filename',
        'original_name',
        'mime_type',
        'extension',
        'size',
        'hash',
        'collection',
        'user_id',
        'mediable_type',
        'mediable_id',
        'meta',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'size' => 'integer',
        'meta' => 'array',
    ];

    /**
     * The accessors to append to the model's array and JSON form.
     *
     * @var list<string>
     */
    protected $appends = [
        'url',
        'human_size',
        'is_image',
    ];

    /**
     * Boot the model. Automatically delete physical storage file upon deletion.
     */
    protected static function booted(): void
    {
        static::deleting(function (self $media): void {
            /** @var MediaStorageService $storage */
            $storage = app(MediaStorageService::class);
            $storage->deletePhysicalFile($media);
        });
    }

    /**
     * Get the relative storage path of the file on disk.
     */
    public function getPathAttribute(): string
    {
        $dir = trim($this->directory, '/');

        return $dir !== '' ? $dir.'/'.$this->filename : $this->filename;
    }

    /**
     * Get the publicly accessible or routed URL of the file.
     */
    public function getUrlAttribute(): string
    {
        /** @var MediaStorageService $storage */
        $storage = app(MediaStorageService::class);

        return $storage->getUrl($this);
    }

    /**
     * Format the file size into a human-readable string.
     */
    public function getHumanSizeAttribute(): string
    {
        $bytes = max(0, $this->size);
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = $bytes > 0 ? floor(log($bytes, 1024)) : 0;
        $power = min((int) $power, count($units) - 1);

        return round($bytes / (1024 ** $power), 2).' '.$units[$power];
    }

    /**
     * Determine if the file is an image based on its mime type.
     */
    public function getIsImageAttribute(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Determine if the media file is currently attached to a parent entity.
     */
    public function getIsAttachedAttribute(): bool
    {
        return ! empty($this->mediable_type) && ! empty($this->mediable_id);
    }

    /**
     * Get the owning mediable model.
     *
     * @return MorphTo<Model, $this>
     */
    public function mediable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who uploaded the file.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope query to a specific collection.
     *
     * @param Builder<$this> $query
     */
    public function scopeCollection(Builder $query, string $collection): void
    {
        $query->where('collection', $collection);
    }

    /**
     * Scope query to only unattached/orphaned files.
     *
     * @param Builder<$this> $query
     */
    public function scopeUnattached(Builder $query): void
    {
        $query->whereNull('mediable_id')->whereNull('mediable_type');
    }

    /**
     * Scope query to only attached files.
     *
     * @param Builder<$this> $query
     */
    public function scopeAttached(Builder $query): void
    {
        $query->whereNotNull('mediable_id')->whereNotNull('mediable_type');
    }

    /**
     * Scope query to files older than a given number of hours.
     *
     * @param Builder<$this> $query
     */
    public function scopeOlderThanHours(Builder $query, int $hours): void
    {
        $query->where('created_at', '<=', now()->subHours($hours));
    }
}
