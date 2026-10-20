import React from 'react';
import { FileUpload, UploadedMediaData } from './FileUpload';

export interface ImagePickerValue {
    id: string | null;
    url: string;
    media?: UploadedMediaData | null;
}

export interface ImagePickerProps {
    label?: string;
    helperText?: string;
    error?: string;
    value?: string;
    mediaId?: string | number | null;
    collection?: string;
    accept?: string;
    disabled?: boolean;
    endpoint?: string;
    onChange: (result: ImagePickerValue) => void;
    className?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
    label = 'Upload Image',
    helperText,
    error,
    value,
    collection = 'default',
    accept = 'image/*',
    disabled = false,
    endpoint = '/admin/media/upload',
    onChange,
    className,
}) => {
    return (
        <FileUpload
            label={label}
            helperText={helperText}
            error={error}
            value={value}
            collection={collection}
            accept={accept}
            disabled={disabled}
            endpoint={endpoint}
            className={className}
            onUploadSuccess={(media: UploadedMediaData) => {
                onChange({
                    id: media.id,
                    url: media.url,
                    media,
                });
            }}
            onRemove={() => {
                onChange({
                    id: null,
                    url: '',
                    media: null,
                });
            }}
        />
    );
};
