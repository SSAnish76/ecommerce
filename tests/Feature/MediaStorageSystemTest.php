<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MediaFile;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use App\Services\Storage\MediaStorageService;
use App\Services\Storage\StorageConfigurator;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaStorageSystemTest extends TestCase
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
     * Test uploading a file via the dedicated endpoint returns ID, URL, and metadata.
     */
    public function test_dedicated_upload_endpoint_stores_file_and_returns_id_and_url(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('test_product.png', 640, 480);

        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.media.upload'), [
                'file' => $file,
                'collection' => 'products',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'disk',
                    'filename',
                    'original_name',
                    'mime_type',
                    'size',
                    'human_size',
                    'url',
                    'is_image',
                    'collection',
                    'meta',
                ],
            ]);

        $responseData = $response->json('data');
        $this->assertNotEmpty($responseData['id']);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $responseData['id']);
        $this->assertSame('test_product.png', $responseData['original_name']);
        $this->assertSame('products', $responseData['collection']);
        $this->assertTrue($responseData['is_image']);

        // Assert database record exists
        $this->assertDatabaseHas('media_files', [
            'id' => $responseData['id'],
            'original_name' => 'test_product.png',
            'collection' => 'products',
            'disk' => 'public',
        ]);

        // Assert file exists on the fake disk
        $mediaFile = MediaFile::find($responseData['id']);
        $this->assertNotNull($mediaFile);
        Storage::disk('public')->assertExists($mediaFile->path);
    }

    /**
     * Test saving/updating an entity using the uploaded file's ID.
     */
    public function test_entity_can_be_saved_using_uploaded_file_id(): void
    {
        Storage::fake('public');

        // 1. Upload the file via the dedicated endpoint
        $file = UploadedFile::fake()->image('store_logo.png', 300, 300);

        $uploadResponse = $this->actingAs($this->adminUser)
            ->postJson(route('admin.media.upload'), [
                'file' => $file,
                'collection' => 'store_branding',
            ]);

        $uploadResponse->assertStatus(201);
        $fileId = $uploadResponse->json('data.id');
        $expectedUrl = $uploadResponse->json('data.url');

        // 2. Save store details passing the file ID (logo_media_id)
        $store = Store::current();

        $updateResponse = $this->actingAs($this->adminUser)
            ->put(route('admin.store.update'), [
                'name' => 'Tech Gadgets Store',
                'email' => 'contact@techstore.com',
                'currency' => 'USD',
                'timezone' => 'America/New_York',
                'logo_media_id' => $fileId,
            ]);

        $updateResponse->assertSessionHasNoErrors();
        $updateResponse->assertRedirect();

        // 3. Verify store has the file attached and URL updated
        $store->refresh();
        $this->assertSame('Tech Gadgets Store', $store->name);
        $this->assertSame($expectedUrl, $store->logo_url);

        // Verify only folder and filename (relative path) is stored in the database!
        $mediaFile = MediaFile::find($fileId);
        $this->assertNotNull($mediaFile);
        $this->assertSame($mediaFile->path, $store->getRawOriginal('logo_url'));
        $this->assertStringNotContainsString('http://', (string) $store->getRawOriginal('logo_url'));
        $this->assertStringNotContainsString('https://', (string) $store->getRawOriginal('logo_url'));
        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'logo_url' => $mediaFile->path,
        ]);

        // Verify the media file is linked to the store
        $this->assertDatabaseHas('media_files', [
            'id' => $fileId,
            'mediable_type' => Store::class,
            'mediable_id' => (string) $store->id,
            'collection' => 'logo',
        ]);
    }

    /**
     * Test HasMedia trait allows attaching, retrieving, and syncing media on models.
     */
    public function test_has_media_trait_attaching_and_syncing(): void
    {
        Storage::fake('public');

        $file1 = UploadedFile::fake()->image('avatar1.jpg');
        $file2 = UploadedFile::fake()->image('avatar2.jpg');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $media1 = $service->store($file1, 'avatars');
        $media2 = $service->store($file2, 'avatars');

        // Attach using trait
        $this->adminUser->attachMedia($media1->id, 'avatar');

        $this->assertSame($media1->url, $this->adminUser->getFirstMediaUrl('avatar'));
        $this->assertSame(1, $this->adminUser->getMedia('avatar')->count());

        // Sync media (replaces existing avatar with second one)
        $this->adminUser->syncMedia($media2->id, 'avatar');

        $this->assertSame($media2->url, $this->adminUser->getFirstMediaUrl('avatar'));
        $this->assertNull(MediaFile::find($media1->id)); // First media was cleared/deleted on sync
    }

    /**
     * Test storage configurator respects database settings.
     */
    public function test_storage_configurator_reads_settings_dynamically(): void
    {
        Setting::set('storage_settings', [
            'default_disk' => 's3',
            's3' => [
                'key' => 'AKIAEXAMPLE123456789',
                'secret' => 'super-secret-aws-key',
                'region' => 'eu-central-1',
                'bucket' => 'my-custom-ecommerce-bucket',
                'url' => 'https://cdn.example.com',
                'endpoint' => '',
            ],
        ]);

        /** @var StorageConfigurator $configurator */
        $configurator = app(StorageConfigurator::class);
        $disk = $configurator->resolveDefaultDisk();

        $this->assertSame('s3', $disk);
        $this->assertSame('AKIAEXAMPLE123456789', Config::get('filesystems.disks.s3.key'));
        $this->assertSame('super-secret-aws-key', Config::get('filesystems.disks.s3.secret'));
        $this->assertSame('eu-central-1', Config::get('filesystems.disks.s3.region'));
        $this->assertSame('my-custom-ecommerce-bucket', Config::get('filesystems.disks.s3.bucket'));
    }

    /**
     * Test media file deletion removes database record and disk file.
     */
    public function test_deleting_media_file_removes_physical_file(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('delete_me.jpg');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $media = $service->store($file);

        Storage::disk('public')->assertExists($media->path);

        $response = $this->actingAs($this->adminUser)
            ->deleteJson(route('admin.media.destroy', ['mediaFile' => $media->id]));

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('media_files', ['id' => $media->id]);
        Storage::disk('public')->assertMissing($media->path);
    }

    /**
     * Test pruning command removes unattached files older than threshold.
     */
    public function test_pruning_command_removes_unattached_files(): void
    {
        Storage::fake('public');

        $file1 = UploadedFile::fake()->create('orphan.pdf', 500);
        $file2 = UploadedFile::fake()->image('attached.jpg');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $orphan = $service->store($file1);
        $attached = $service->store($file2);

        // Attach second file
        $service->attachToModel($attached, $this->adminUser, 'id_doc');

        // Set orphan created_at to 2 days ago
        $orphan->forceFill(['created_at' => now()->subHours(48)])->save();

        $this->artisan('media:prune-unattached', ['--hours' => 24])
            ->assertSuccessful()
            ->expectsOutputToContain('Successfully pruned 1 unattached media file(s).');

        $this->assertDatabaseMissing('media_files', ['id' => $orphan->id]);
        $this->assertDatabaseHas('media_files', ['id' => $attached->id]);
    }

    /**
     * Test validation fails when file is not provided or invalid.
     */
    public function test_upload_validation_fails_for_invalid_file(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson(route('admin.media.upload'), [
                'file' => 'not-a-file',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * Test viewing a media file inline via media.view route.
     */
    public function test_media_view_serves_file_inline(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('preview_test.jpg', 400, 400);

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $media = $service->store($file);

        $response = $this->get(route('media.view', ['mediaFile' => $media->id]));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/jpeg');
        $this->assertStringContainsString('inline', (string) $response->headers->get('Content-Disposition'));
    }

    /**
     * Test media view route serves files by both ID and filename.
     */
    public function test_media_view_serves_file_by_id_and_filename(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('sample.txt', 200, 'text/plain');

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $media = $service->store($file);

        // View by ID
        $responseById = $this->get(route('media.view', ['mediaFile' => $media->id]));
        $responseById->assertOk();
        $this->assertStringContainsString('inline', (string) $responseById->headers->get('Content-Disposition'));

        // View by filename
        $responseByFilename = $this->get(route('media.view', ['mediaFile' => $media->filename]));
        $responseByFilename->assertOk();
        $this->assertStringContainsString('inline', (string) $responseByFilename->headers->get('Content-Disposition'));
    }

    /**
     * Test that the database stores only relative folder and filename,
     * ensuring changing domains in the future does not affect or break stored paths.
     */
    public function test_database_saves_only_folder_and_filename_and_domain_changes_do_not_break_urls(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('brand_logo.png', 200, 200);

        /** @var MediaStorageService $service */
        $service = app(MediaStorageService::class);
        $media = $service->store($file, 'store_branding');

        $store = Store::current();

        // 1. Pass full URL to the model
        $store->update([
            'logo_url' => $media->url,
        ]);

        $store->refresh();

        // 2. The raw database column must ONLY contain folder and filename
        $this->assertSame($media->path, $store->getRawOriginal('logo_url'));
        $this->assertSame($media->path, $store->getRawLogoPath());
        $this->assertStringNotContainsString('http://', (string) $store->getRawOriginal('logo_url'));
        $this->assertStringNotContainsString('localhost', (string) $store->getRawOriginal('logo_url'));

        // 3. Simulate future domain change
        \Illuminate\Support\Facades\URL::forceRootUrl('https://new-future-domain.com');

        // Dynamically resolved URL uses the new domain seamlessly
        $this->assertStringStartsWith('http://new-future-domain.com', (string) $store->logo_url);
        $this->assertStringContainsString($media->id, (string) $store->logo_url);

        // Database row remains untouched with relative path
        $this->assertSame($media->path, $store->getRawOriginal('logo_url'));
    }
}


