<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\MediaFile;
use App\Services\FileStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $collection = $request->string('collection')->trim()->value();
        $search = $request->string('search')->trim()->value();

        $files = MediaFile::query()
            ->when($collection !== '', fn (Builder $query) => $query->where('collection', $collection))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(fn (Builder $searchQuery) => $searchQuery
                    ->where('original_name', 'like', "%{$search}%")
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

    public function upload(Request $request, FileStorageService $storage): JsonResponse
    {
        $maxUploadKilobytes = $storage->maxUploadKilobytes();
        $validated = $request->validate([
            'file' => ['required', 'file', "max:{$maxUploadKilobytes}", 'mimes:jpg,jpeg,png,webp,gif,ico,pdf,doc,docx,xls,xlsx,txt,csv,zip'],
            'collection' => ['nullable', 'string', 'max:60'],
            'folder' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_\-\/]+$/'],
        ]);

        $directory = trim((string) ($validated['folder'] ?? ''), '/');
        $mediaFile = $storage->store(
            file: $validated['file'],
            collection: (string) ($validated['collection'] ?? 'default'),
            userId: $request->user()?->getAuthIdentifier() ? (string) $request->user()->getAuthIdentifier() : null,
            directory: $directory !== '' ? $directory : null,
        );

        return response()->json([
            'success' => true,
            'message' => 'File uploaded successfully.',
            'data' => $this->formatMedia($mediaFile),
        ], 201);
    }

    public function show(MediaFile $mediaFile): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->formatMedia($mediaFile)]);
    }

    public function view(string|int $mediaFile, FileStorageService $storage): StreamedResponse|JsonResponse
    {
        $media = $this->resolveMedia((string) $mediaFile);

        if (! $media) {
            return response()->json(['success' => false, 'message' => 'Media file not found.'], 404);
        }

        $storage->configureDisk($media->disk);

        if (! Storage::disk($media->disk)->exists($media->path)) {
            return response()->json(['success' => false, 'message' => 'Media file not found.'], 404);
        }

        $isUnsafeInline = in_array(strtolower((string) $media->extension), ['svg', 'html', 'htm', 'xml', 'js'], true)
            || str_contains(strtolower((string) $media->mime_type), 'svg')
            || str_contains(strtolower((string) $media->mime_type), 'html');
        $disposition = $isUnsafeInline ? 'attachment' : 'inline';

        return Storage::disk($media->disk)->response($media->path, $media->original_name, [
            'Content-Type' => $media->mime_type,
            'Content-Disposition' => $disposition.'; filename="'.addcslashes(basename($media->original_name), '"\\').'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function download(string|int $mediaFile, FileStorageService $storage): StreamedResponse|JsonResponse
    {
        $media = $this->resolveMedia((string) $mediaFile);

        if (! $media) {
            return response()->json(['success' => false, 'message' => 'Media file not found.'], 404);
        }

        $storage->configureDisk($media->disk);

        if (! Storage::disk($media->disk)->exists($media->path)) {
            return response()->json(['success' => false, 'message' => 'Media file not found.'], 404);
        }

        return Storage::disk($media->disk)->download($media->path, $media->original_name, [
            'Content-Type' => $media->mime_type,
        ]);
    }

    public function destroy(MediaFile $mediaFile, FileStorageService $storage): JsonResponse
    {
        $storage->delete($mediaFile);

        return response()->json(['success' => true, 'message' => 'Media file deleted successfully.']);
    }

    protected function resolveMedia(string $identifier): ?MediaFile
    {
        return MediaFile::find($identifier)
            ?? MediaFile::query()->where('filename', basename($identifier))->first();
    }

    /**
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
