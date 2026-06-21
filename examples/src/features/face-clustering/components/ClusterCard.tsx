import type { FaceCluster } from 'facenet-js';
import type { EmbeddingWithSource, FaceSource } from 'facenet-js/react';
import { useCallback, useState } from 'react';
import {
  getClusterLabel,
  getConfidenceColor,
  getPhotoFaceCounts,
  getPhotoGridClass,
  getUniquePhotos,
} from '../utils/clusterDisplayHelpers';

interface ClusterCardProps {
  cluster: FaceCluster;
  embeddingsWithSource: EmbeddingWithSource[];
  photos: FaceSource[];
  clusterIndex: number;
  onClusterTag?: (clusterId: string, tag: string) => void;
  clusterTag?: string;
  isSelected?: boolean;
  onClusterSelect?: (clusterId: string) => void;
}

export const ClusterCard = ({
  cluster,
  embeddingsWithSource,
  photos,
  clusterIndex,
  onClusterTag,
  clusterTag,
  isSelected = false,
  onClusterSelect,
}: ClusterCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTag, setEditingTag] = useState(clusterTag || '');
  const clusterLabel = getClusterLabel(clusterIndex);

  const handleSaveTag = useCallback(() => {
    if (onClusterTag && editingTag.trim()) {
      onClusterTag(cluster.id, editingTag.trim());
    }
    setIsEditing(false);
  }, [onClusterTag, cluster.id, editingTag]);

  const handleCancelEdit = useCallback(() => {
    setEditingTag(clusterTag || '');
    setIsEditing(false);
  }, [clusterTag]);

  const clusterPhotos = cluster.memberIndices.reduce<
    {
      photo: FaceSource;
      embeddingWithSource: EmbeddingWithSource;
      memberIndex: number;
    }[]
  >((items, memberIndex) => {
    const embeddingWithSource = embeddingsWithSource[memberIndex];
    if (embeddingWithSource) {
      const photo = photos[embeddingWithSource.sourceIndex];
      if (photo) {
        items.push({
          photo,
          embeddingWithSource,
          memberIndex,
        });
      }
    }
    return items;
  }, []);

  const uniquePhotos = getUniquePhotos(clusterPhotos);
  const photoFaceCounts = getPhotoFaceCounts(clusterPhotos);
  const confidencePercentage = Math.round(cluster.confidence * 100);
  const confidenceColor = getConfidenceColor(cluster.confidence);

  return (
    <div
      className={`demo-card p-4 ${isSelected ? 'ring-2 ring-[var(--demo-accent)] border-[var(--demo-accent)]' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editingTag}
                onChange={e => setEditingTag(e.target.value)}
                placeholder="Enter person name..."
                className="demo-input px-2 py-1 text-sm flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTag();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button
                onClick={handleSaveTag}
                className="demo-button demo-button-success px-2 py-1 text-xs"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="demo-button demo-button-secondary px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-[var(--demo-text)]">
                {clusterTag || clusterLabel}
              </h4>
              {onClusterTag && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="demo-button demo-button-secondary text-xs px-2 py-0.5"
                  title="Add name tag"
                >
                  {clusterTag ? 'Edit' : 'Tag'}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className={`font-medium ${confidenceColor}`}>
            {confidencePercentage}% confidence
          </span>
          <span className="demo-subtle">
            {cluster.size} face{cluster.size !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {onClusterSelect && (
        <button
          onClick={() => onClusterSelect(cluster.id)}
          className={`demo-button w-full mb-3 py-2 px-3 text-sm ${
            isSelected ? 'demo-button-accent' : 'demo-button-secondary text-[var(--demo-accent)]'
          }`}
        >
          {isSelected ? 'Selected for Webcam Comparison' : 'Select for Webcam Comparison'}
        </button>
      )}

      <div className="space-y-3">
        <div className={`grid gap-2 ${getPhotoGridClass(uniquePhotos.length)}`}>
          {uniquePhotos.slice(0, isExpanded ? uniquePhotos.length : 3).map((item, index) => (
            <div key={`${item.photo.id}-${index}`} className="relative group">
              <div className="demo-media-frame aspect-square overflow-hidden">
                <img
                  src={item.photo.image.src}
                  alt={`${clusterLabel} - Photo ${index + 1}`}
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
        <div className="grid grid-cols-2 gap-4 text-xs demo-subtle demo-numeric">
          <div>
            <span className="font-medium">Unique Photos:</span> {uniquePhotos.length}
          </div>
          <div>
            <span className="font-medium">Total Faces:</span> {cluster.size}
          </div>
        </div>
      </div>
    </div>
  );
};
