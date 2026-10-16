<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\MediaFile;
use App\Services\Storage\MediaStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Display a paginated listing of media files.
     */
    public function index(Request $request): JsonResponse
    {
        $collection = $request->string('collection')->trim()->value();
        $search = $request->string('search')->trim()->value();

        $files = MediaFile::query()
            ->when($collection !== '', fn (Builder $q) => $q->where('collection', $collection))
            ->when($search !== '', function (Builder $q) use ($search): void {
                $q->where(fn (Builder $sq) => $sq->where('original_name', 'like', "%{$search}%")
                    ->orWhere('filename', 'like', "%{$search}%"));
            })
            ->latest('created_at')
            ->paginate($request->integer('per_page', 24));

        return response()->json([
            'success' => true,
            'data' => array_map(fn (MediaFile $file) => $this->formatMedia($file), $files->items()),
            'pagination' => [
                'total' => $files->total(),
                'per_page' => $files->perPage(),
                'current_page' => $files->currentPage(),
                'last_page' => $files->lastPage(),
            ],
        ]);
    }

    /**
     * Dedicated upload endpoint to store a file and return its ID, URL, and attributes.
     */
    public function upload(Request $request, MediaStorageService $storage): JsonResponse
    {
        $maxKb = $storage->configurator()->getMaxUploadKilobytes();

        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                "max:{$maxKb}",
                'mimes:jpg,jpeg,png,webp,gif,svg,ico,pdf,doc,docx,xls,xlsx,txt,csv,zip',
            ],
            'collection' => ['nullable', 'string', 'max:60'],
            'folder' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_\-\/]+$/'],
        ], [
            'file.required' => 'Please select a file to upload.',
            'file.file' => 'The uploaded item must be a valid file.',
            'file.max' => 'The file size exceeds the maximum allowed storage limit.',
            'file.mimes' => 'The file format is not supported. Please upload a supported image or document.',
        ]);

        $mediaFile = $storage->store(
            file: $request->file('file'),
            collection: (string) ($validated['collection'] ?? 'default'),
            userId: $request->user()?->getAuthIdentifier() ? (string) $request->user()->getAuthIdentifier() : null,
            customDirectory: ! empty($validated['folder']) ? (string) $validated['folder'] : null,
        );

        return response()->json([
            'success' => true,
            'message' => 'File uploaded successfully.',
            'data' => $this->formatMedia($mediaFile),
        ], 201);
    }

    /**
     * Display the specified media file metadata.
     */
    public function show(MediaFile $mediaFile): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->formatMedia($mediaFile),
        ]);
    }

    /**
     * View or stream the media file inline in the browser.
     */
    public function view(string|int $mediaFile, MediaStorageService $storage): StreamedResponse|JsonResponse
    {
        $media = $this->resolveMedia($mediaFile);
        if (! $media) {
            return response()->json(['success' => false, 'message' => 'Media file not found.'], 404);
        }

        $driver = $storage->driver($media->disk);
        if (! $driver->exists($media->path)) {
            return response()->json(['success' => false, 'message' => 'File not found in storage.'], 404);
        }

        return response()->stream(
            function () use ($driver, $media): void {
                $stream = $driver->readStream($media->path);
                if (is_resource($stream)) {
                    fpassthru($stream);
                    fclose($stream);
                }
            },
            200,
            [
                'Content-Type' => $media->mime_type,
                'Content-Length' => (string) $media->size,
                'Content-Disposition' => 'inline; filename="'.addslashes($media->original_name).'"',
                'Cache-Control' => 'public, max-age=86400',
            ]
        );
    }

    /**
     * Stream or download the media file from disk as an attachment.
     */
    public function download(string|int $mediaFile, MediaStorageService $storage): StreamedResponse|JsonResponse
    {
        $media = $this->resolveMedia($mediaFile);
        if (! $media) {
            return response()->json(['success' => false, 'message' => 'Media file not found.'], 404);
        }

        $driver = $storage->driver($media->disk);
        if (! $driver->exists($media->path)) {
            return response()->json(['success' => false, 'message' => 'File not found in storage.'], 404);
        }

        return response()->streamDownload(
            function () use ($driver, $media): void {
                $stream = $driver->readStream($media->path);
                if (is_resource($stream)) {
                    fpassthru($stream);
                    fclose($stream);
                }
            },
            $media->original_name,
            [
                'Content-Type' => $media->mime_type,
                'Content-Length' => (string) $media->size,
            ]
        );
    }

    /**
     * Delete the specified media file.
     */
    public function destroy(MediaFile $mediaFile, MediaStorageService $storage): JsonResponse
    {
        $storage->delete($mediaFile);

        return response()->json([
            'success' => true,
            'message' => 'Media file deleted successfully.',
        ]);
    }

    /**
     * Find a MediaFile by ID, filename, or path.
     */
    protected function resolveMedia(string|int $mediaFile): ?MediaFile
    {
        $identifier = (string) $mediaFile;

        $media = MediaFile::find($identifier);
        if ($media) {
            return $media;
        }

        $filename = basename($identifier);

        return MediaFile::query()
            ->where('filename', $filename)
            ->first();
    }

    /**
     * Format a MediaFile model into an array response structure.
     *
     * @return array<string, mixed>
     */
    protected function formatMedia(MediaFile $media): array
    {
        return [
            'id' => $media->id,
            'disk' => $media->disk,
            'directory' => $media->directory,
            'filename' => $media->filename,
            'path' => $media->path,
            'original_name' => $media->original_name,
            'mime_type' => $media->mime_type,
            'extension' => $media->extension,
            'size' => $media->size,
            'human_size' => $media->human_size,
            'url' => $media->url,
            'is_image' => $media->is_image,
            'collection' => $media->collection,
            'created_at' => $media->created_at?->toIso8601String(),
        ];
    }
}
