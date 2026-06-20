import type { FaceSource } from 'facenet-js/react';
import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

interface PhotoUploadAreaProps {
  onPhotosUpload: (photos: FaceSource[]) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
}

export const PhotoUploadArea = ({ onPhotosUpload, onError, disabled = false }: PhotoUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<FaceSource[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 20;

    const fileArray = Array.from(files);

    if (fileArray.length > maxFiles) {
      onError(new Error(`Too many files. Maximum ${maxFiles} photos allowed.`));
      return;
    }

    const validFiles = fileArray.filter(file => {
      if (!validImageTypes.includes(file.type)) {
        onError(new Error(`Invalid file type: ${file.name}. Only JPG, PNG, and WebP are supported.`));
        return false;
      }
      if (file.size > maxFileSize) {
        onError(new Error(`File too large: ${file.name}. Maximum size is 10MB.`));
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    try {
      const photos: FaceSource[] = [];
      const loadPromises = validFiles.map((file, index) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              photos.push({
                image: img,
                id: `photo-${Date.now()}-${index}`,
              });
              resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
            img.src = reader.result as string;
          };
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      await Promise.all(loadPromises);

      setUploadedPhotos(photos);
      onPhotosUpload(photos);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to process photos'));
    }
  }, [disabled, onPhotosUpload, onError]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!disabled && e.dataTransfer.files) {
      void handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (!disabled && e.target.files) {
      void handleFiles(e.target.files);
    }
  }, [disabled, handleFiles]);

  const handleClearPhotos = useCallback(() => {
    setUploadedPhotos([]);
    onPhotosUpload([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onPhotosUpload]);

  const removePhoto = useCallback((photoId: string) => {
    const updatedPhotos = uploadedPhotos.filter(photo => photo.id !== photoId);
    setUploadedPhotos(updatedPhotos);
    onPhotosUpload(updatedPhotos);
  }, [uploadedPhotos, onPhotosUpload]);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Upload Photos</h3>

      {uploadedPhotos.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging
              ? 'border-purple-400 bg-purple-50'
              : disabled
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-purple-600 text-4xl">📸</div>
            <div>
              <h4 className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                {isDragging ? 'Drop photos here!' : 'Add photos to cluster'}
              </h4>
              <p className={`text-sm mt-1 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                Drag and drop multiple photos or click to browse
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                }`}
            >
              Choose Photos
            </button>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Supports JPG, PNG, WebP (max 10MB each)</p>
              <p>• Add up to 20 photos at once</p>
              <p>• Each photo must have at least one and only one face</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} uploaded
            </p>
            <div className="space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={`px-3 py-1 text-sm rounded ${disabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
              >
                Add More
              </button>
              <button
                onClick={handleClearPhotos}
                disabled={disabled}
                className={`px-3 py-1 text-sm rounded ${disabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {uploadedPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.image.src}
                    alt={`Photo ${photo.id}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {!disabled && (
                  <button
                    onClick={() => removePhoto(photo.id!)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};
