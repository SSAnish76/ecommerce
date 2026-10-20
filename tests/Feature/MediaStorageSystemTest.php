<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MediaFile;
use App\Models\Store;
use App\Models\User;
use App\Services\FileStorageService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
     * Test uploading a file via the dedicated endpoint returns ID, URL, and timestamp filename.
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
                ],
            ]);

        $responseData = $response->json('data');
        $this->assertNotEmpty($responseData['id']);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $responseData['id']);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}\.png$/i', (string) $responseData['filename']);
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
     * Test saving/updating an entity using the uploaded file's ID linked to media table.
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

        // 2. Save store details passing the file ID (logo_id)
        $store = Store::current();

        $updateResponse = $this->actingAs($this->adminUser)
            ->put(route('admin.store.update'), [
                'name' => 'Tech Gadgets Store',
                'email' => 'contact@techstore.com',
                'currency' => 'USD',
                'timezone' => 'America/New_York',
                'logo_id' => $fileId,
            ]);

        $updateResponse->assertSessionHasNoErrors();
        $updateResponse->assertRedirect();

        // 3. Verify store has the file linked via logo_id foreign key
        $store->refresh();
        $this->assertSame('Tech Gadgets Store', $store->name);
        $this->assertSame($fileId, $store->logo_id);
        $this->assertSame($expectedUrl, $store->logo_url);
        $this->assertNotNull($store->logo);
        $this->assertSame($fileId, $store->logo->id);

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'logo_id' => $fileId,
        ]);
    }

    /**
     * Test media file deletion removes database record and disk file.
     */
    public function test_deleting_media_file_removes_physical_file(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('delete_me.jpg');

        /** @var FileStorageService $service */
        $service = app(FileStorageService::class);
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

        /** @var FileStorageService $service */
        $service = app(FileStorageService::class);
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

        /** @var FileStorageService $service */
        $service = app(FileStorageService::class);
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
     * Test that linking media files to store allows dynamic URLs and domain changes.
     */
    public function test_linked_store_media_dynamically_adapts_to_domain_changes(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('brand_logo.png', 200, 200);

        /** @var FileStorageService $service */
        $service = app(FileStorageService::class);
        $media = $service->store($file, 'store_branding');

        $store = Store::current();
        $store->update(['logo_id' => $media->id]);
        $store->refresh();

        $this->assertSame($media->id, $store->logo_id);
        $this->assertSame($media->url, $store->logo_url);

        // Simulate domain change
        \Illuminate\Support\Facades\URL::forceRootUrl('https://new-future-domain.com');

        $this->assertStringContainsString('new-future-domain.com', (string) $store->logo_url);
        $this->assertStringContainsString($media->id, (string) $store->logo_url);
    }

}
