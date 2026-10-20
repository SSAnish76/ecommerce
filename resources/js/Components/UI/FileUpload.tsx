import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface UploadedMediaData {
    id: string;
    url: string;
    path?: string;
    directory?: string;
    filename?: string;
    original_name: string;
    mime_type: string;
    size: number;
    human_size?: string;
    is_image?: boolean;
}

export interface FileUploadProps {
    label?: string;
    helperText?: string;
    error?: string;
    value?: string;
    collection?: string;
    accept?: string;
    disabled?: boolean;
    endpoint?: string;
    onUploadSuccess?: (media: UploadedMediaData) => void;
    onRemove?: () => void;
    className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    label,
    helperText,
    error,
    value,
    collection = 'default',
    accept = 'image/*',
    disabled = false,
    endpoint = '/admin/media/upload',
    onUploadSuccess,
    onRemove,
    className,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const getCsrfToken = (): string => {
        const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
        if (metaTag && metaTag.content) {
            return metaTag.content;
        }

        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }

        return '';
    };

    const handleFileSelected = async (file: File) => {
        if (!file || disabled) return;

        setUploadError(null);
        setIsUploading(true);
        setUploadProgress(10);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('collection', collection);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', endpoint, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Accept', 'application/json');

            const token = getCsrfToken();
            if (token) {
                xhr.setRequestHeader('X-CSRF-TOKEN', token);
            }

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 90);
                    setUploadProgress(Math.max(10, percent));
                }
            };

            xhr.onload = () => {
                setIsUploading(false);
                setUploadProgress(100);

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const json = JSON.parse(xhr.responseText);
                        const media: UploadedMediaData = json.data;
                        if (onUploadSuccess) {
                            onUploadSuccess(media);
                        }
                    } catch (err) {
                        setUploadError('Failed to parse upload response.');
                    }
                } else {
                    try {
                        const errJson = JSON.parse(xhr.responseText);
                        setUploadError(errJson.message || errJson.errors?.file?.[0] || 'Upload failed.');
                    } catch {
                        setUploadError(`Upload failed with status code ${xhr.status}.`);
                    }
                }
            };

            xhr.onerror = () => {
                setIsUploading(false);
                setUploadError('Network error occurred during file upload.');
            };

            xhr.send(formData);
        } catch (e: any) {
            setIsUploading(false);
            setUploadError(e.message || 'An unexpected error occurred during upload.');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (disabled || isUploading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelected(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled && !isUploading) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const hasValue = Boolean(value && value.trim() !== '');

    return (
        <div className={cn('w-full space-y-2', className)}>
            {/* Header / Label */}
            {label && (
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                </label>
            )}

            {hasValue ? (
                /* Existing preview card */
                <div className="relative p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 backdrop-blur-xs flex items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Click to view full image in new tab"
                            className="group/thumb relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs hover:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <img
                                src={value}
                                alt="Uploaded preview"
                                className="w-full h-full object-contain p-1 group-hover/thumb:scale-105 transition-transform"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.opacity = '0.3';
                                }}
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye className="w-4 h-4" />
                            </div>
                            <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600 -z-10 absolute" />
                        </a>

                        <div className="min-w-0">
                            <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[220px] block hover:underline"
                                title="Open file in new tab"
                            >
                                {value?.split('/').pop() || 'Uploaded Media File'}
                            </a>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                Active Asset
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                            title="View in new tab"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                        </a>

                        {!disabled && (
                            <>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                >
                                    Replace
                                </Button>
                                {onRemove && (
                                    <button
                                        type="button"
                                        onClick={onRemove}
                                        title="Remove asset"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* Dropzone upload area */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                    className={cn(
                        'relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center select-none',
                        isDragging
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 scale-[0.99]'
                            : 'border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/70',
                        disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
                        isUploading && 'pointer-events-none'
                    )}
                >
                    {isUploading ? (
                        <div className="w-full max-w-xs space-y-3 py-2">
                            <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Uploading file ({uploadProgress}%)...</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-2xs group-hover:scale-110 transition-transform">
                                <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Click to upload <span className="font-normal text-slate-500 dark:text-slate-400">or drag and drop</span>
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                {accept.includes('image') ? 'PNG, JPG, WEBP, SVG or ICO' : 'Supported files up to 25MB'}
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                disabled={disabled || isUploading}
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                        e.target.value = '';
                    }
                }}
                className="hidden"
            />

            {/* Helper Text or Error Messages */}
            {(uploadError || error) ? (
                <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {uploadError || error}
                </p>
            ) : helperText ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
            ) : null}
        </div>
    );
};
