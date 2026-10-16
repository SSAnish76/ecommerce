<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MediaFile;
use App\Models\Setting;
use App\Models\User;
use App\Services\Storage\Drivers\LocalStorageDriver;
use App\Services\Storage\Drivers\S3StorageDriver;
use App\Services\Storage\Drivers\StorageDriverInterface;
use App\Services\Storage\MediaOptimizer;
use App\Services\Storage\MediaStorageService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SettingSeeder;
use DateTimeInterface;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\TestCase;

class StorageDriverArchitectureTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RolesAndPermissionsSeeder::class,
            SettingSeeder::class,
        ]);

        $this->adminUser = User::where('email', 'admin@example.com')->first();
    }

    /**
     * Test MediaStorageService registers and resolves standard drivers.
     */
    public function test_storage_service_resolves_standard_drivers(): void
    {
        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);

        $this->assertTrue($service->hasDriver('public'));
        $this->assertTrue($service->hasDriver('local'));
        $this->assertTrue($service->hasDriver('s3'));

        $this->assertInstanceOf(LocalStorageDriver::class, $service->driver('public'));
        $this->assertInstanceOf(LocalStorageDriver::class, $service->driver('local'));
        $this->assertInstanceOf(S3StorageDriver::class, $service->driver('s3'));
    }

    /**
     * Test MediaStorageService throws InvalidArgumentException for unregistered driver.
     */
    public function test_storage_service_throws_for_unregistered_driver(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Storage driver [ftp] is not registered.');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $service->driver('ftp');
    }

    /**
     * Test registering a custom storage driver dynamically.
     */
    public function test_developers_can_register_custom_storage_drivers(): void
    {
        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);

        $customDriver = new class implements StorageDriverInterface {
            public function name(): string
            {
                return 'mock-cloud';
            }

            public function isConfigured(): bool
            {
                return true;
            }

            public function put(string $path, mixed $contents, array $options = []): bool
            {
                return true;
            }

            public function putFileAs(string $directory, UploadedFile|string $file, string $name, array $options = []): string|false
            {
                return $directory.'/'.$name;
            }

            public function get(string $path): ?string
            {
                return 'cloud-contents';
            }

            public function readStream(string $path)
            {
                return null;
            }

            public function delete(string $path): bool
            {
                return true;
            }

            public function exists(string $path): bool
            {
                return true;
            }

            public function size(string $path): int
            {
                return 1024;
            }

            public function mimeType(string $path): ?string
            {
                return 'application/octet-stream';
            }

            public function url(string $path, ?MediaFile $media = null): string
            {
                return 'https://mockcloud.example.com/'.$path;
            }

            public function temporaryUrl(string $path, DateTimeInterface $expiration, array $options = []): string
            {
                return 'https://mockcloud.example.com/temp/'.$path;
            }

            public function filesystem(): Filesystem
            {
                return Storage::disk('public');
            }
        };

        $service->register($customDriver);

        $this->assertTrue($service->hasDriver('mock-cloud'));
        $this->assertSame($customDriver, $service->driver('mock-cloud'));
    }

    /**
     * Test LocalStorageDriver operations on fake storage.
     */
    public function test_local_storage_driver_crud_operations(): void
    {
        Storage::fake('public');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $driver = $service->driver('public');

        $this->assertSame('public', $driver->name());
        $this->assertTrue($driver->isConfigured());

        // Put and exists
        $driver->put('test/hello.txt', 'Hello Public World');
        $this->assertTrue($driver->exists('test/hello.txt'));
        $this->assertSame('Hello Public World', $driver->get('test/hello.txt'));
        $this->assertSame(18, $driver->size('test/hello.txt'));

        // Delete
        $this->assertTrue($driver->delete('test/hello.txt'));
        $this->assertFalse($driver->exists('test/hello.txt'));
    }

    /**
     * Test S3StorageDriver configuration detection.
     */
    public function test_s3_storage_driver_configuration_detection(): void
    {
        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $s3Driver = $service->driver('s3');

        $this->assertSame('s3', $s3Driver->name());

        // Initially without key/bucket in settings
        Setting::set('storage_settings', [
            'default_disk' => 'public',
            's3' => ['key' => '', 'bucket' => ''],
        ]);
        Config::set('filesystems.disks.s3.key', '');
        Config::set('filesystems.disks.s3.bucket', '');

        $this->assertFalse($s3Driver->isConfigured());

        // Now configured
        Setting::set('storage_settings', [
            'default_disk' => 's3',
            's3' => [
                'key' => 'AKIA123TEST',
                'secret' => 'SECRETKEY123',
                'region' => 'us-east-1',
                'bucket' => 'test-bucket',
            ],
        ]);

        $this->assertTrue($s3Driver->isConfigured());
    }

    /**
     * Test MediaOptimizer downscales large images and extracts rich metadata.
     */
    public function test_media_optimizer_resizes_large_images(): void
    {
        /** @var MediaOptimizer $optimizer */
        $optimizer = app(MediaOptimizer::class);

        $this->assertTrue($optimizer->isSupported('image/jpeg'));
        $this->assertTrue($optimizer->isSupported('image/png'));
        $this->assertTrue($optimizer->isSupported('image/webp'));
        $this->assertFalse($optimizer->isSupported('application/pdf'));

        // Create large 2500x1500 fake image
        $largeImage = UploadedFile::fake()->image('huge_banner.jpg', 2500, 1500);

        $meta = $optimizer->optimizeUploadedFile($largeImage, [
            'max_width' => 1920,
            'max_height' => 1080,
            'quality' => 80,
        ]);

        $this->assertTrue($meta['optimized']);
        $this->assertLessThanOrEqual(1920, $meta['width']);
        $this->assertLessThanOrEqual(1080, $meta['height']);
        $this->assertGreaterThan(0, $meta['aspect_ratio']);
    }

    /**
     * Test MediaOptimizer handles non-image files gracefully without error.
     */
    public function test_media_optimizer_skips_non_image_files_safely(): void
    {
        /** @var MediaOptimizer $optimizer */
        $optimizer = app(MediaOptimizer::class);

        $textFile = UploadedFile::fake()->create('contract.txt', 50, 'text/plain');

        $meta = $optimizer->optimizeUploadedFile($textFile);

        $this->assertFalse($meta['optimized']);
        $this->assertArrayNotHasKey('width', $meta);
    }

    /**
     * Test storing an image via MediaStorageService automatically optimizes and stores file.
     */
    public function test_storing_image_via_service_applies_optimization(): void
    {
        Storage::fake('public');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);

        // Upload a 2400x1200 image
        $file = UploadedFile::fake()->image('catalog_cover.jpg', 2400, 1200);

        $media = $service->store($file, 'catalogs');

        $this->assertNotNull($media);
        $this->assertSame('catalogs', $media->collection);
        $this->assertTrue($media->is_image);
        $this->assertMatchesRegularExpression('/^[0-9]+_[a-zA-Z0-9]+\.jpg$/', $media->filename);

        // Assert file exists on storage
        Storage::disk('public')->assertExists($media->path);
    }
}
