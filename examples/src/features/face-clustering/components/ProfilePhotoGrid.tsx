import type { FaceSource } from 'facenet-js/react';

interface ProfilePhotoGridProps {
  photos: FaceSource[];
  disabled: boolean;
  onRemovePhoto: (photoId: string) => void;
}

export const ProfilePhotoGrid = ({ photos, disabled, onRemovePhoto }: ProfilePhotoGridProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {photos.map(photo => (
        <div key={photo.id} className="relative group">
          <div className="demo-media-frame aspect-square overflow-hidden">
            <img src={photo.image.src} alt={`Photo ${photo.id}`} className="w-full h-full object-cover" />
          </div>
          {!disabled && (
            <button
              onClick={() => onRemovePhoto(photo.id!)}
              className="demo-button demo-button-danger absolute -top-1 -right-1 rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove photo"
            >
              x
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
