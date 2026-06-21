import type { EmbeddingWithSource, FaceSource } from 'facenet-js/react';
import { useState } from 'react';
import {
  getPhotoFaceCounts,
  getPhotoGridClass,
  getUniquePhotos,
} from '../utils/clusterDisplayHelpers';

interface OutlierCardProps {
  embeddingsWithSource: EmbeddingWithSource[];
  photos: FaceSource[];
}

export const OutlierCard = ({ embeddingsWithSource, photos }: OutlierCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const outlierPhotos = embeddingsWithSource.map(embeddingWithSource => {
    const photo = photos[embeddingWithSource.sourceIndex];
    return { photo, embeddingWithSource };
  });

  const uniquePhotos = getUniquePhotos(outlierPhotos);
  const photoFaceCounts = getPhotoFaceCounts(outlierPhotos);

  if (uniquePhotos.length === 0) return null;

  return (
    <div className="demo-callout demo-callout-warning p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Unique Faces</h4>
        <div className="flex items-center space-x-2 text-sm">
          <span className="demo-numeric">
            {embeddingsWithSource.length} face{embeddingsWithSource.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`grid gap-2 ${getPhotoGridClass(uniquePhotos.length)}`}>
          {uniquePhotos.slice(0, isExpanded ? uniquePhotos.length : 3).map((item, index) => (
            <div key={`outlier-${item.photo.id}-${index}`} className="relative group">
              <div className="demo-media-frame aspect-square overflow-hidden">
                <img
                  src={item.photo.image.src}
                  alt={`Unique face ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {(photoFaceCounts.get(item.photo.id) ?? 0) > 1 && (
                <div className="absolute top-1 right-1 bg-[var(--demo-text)] text-white text-xs px-1.5 py-0.5 rounded demo-numeric">
                  {photoFaceCounts.get(item.photo.id)} faces
                </div>
              )}
            </div>
          ))}
        </div>

        {uniquePhotos.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="demo-button demo-button-secondary w-full py-2 text-sm"
          >
            {isExpanded ? 'Show Less' : `Show ${uniquePhotos.length - 3} More`}
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--demo-border)]">
        <p className="text-xs">
          These faces don't match closely enough to form clusters with the current similarity
          threshold.
        </p>
      </div>
    </div>
  );
};
