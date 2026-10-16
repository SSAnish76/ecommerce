<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\MediaFile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MediaFile>
 */
class MediaFileFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<MediaFile>
     */
    protected $model = MediaFile::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $extension = fake()->randomElement(['png', 'jpg', 'webp', 'pdf', 'docx']);
        $isImage = in_array($extension, ['png', 'jpg', 'webp'], true);
        $uuid = (string) Str::uuid();

        return [
            'id' => $uuid,
            'disk' => 'public',
            'directory' => 'media/'.date('Y/m'),
            'filename' => "{$uuid}.{$extension}",
            'original_name' => fake()->word().".{$extension}",
            'mime_type' => $isImage ? "image/{$extension}" : 'application/pdf',
            'extension' => $extension,
            'size' => fake()->numberBetween(1024, 2048000),
            'hash' => fake()->sha256(),
            'collection' => 'default',
            'user_id' => null,
            'mediable_type' => null,
            'mediable_id' => null,
            'meta' => $isImage ? [
                'width' => 800,
                'height' => 600,
                'aspect_ratio' => 1.33,
            ] : null,
        ];
    }

    /**
     * Indicate that the media is attached to a given model.
     */
    public function attachedTo(\Illuminate\Database\Eloquent\Model $model, string $collection = 'default'): static
    {
        return $this->state(fn (array $attributes) => [
            'mediable_type' => $model->getMorphClass(),
            'mediable_id' => (string) $model->getKey(),
            'collection' => $collection,
        ]);
    }
}
