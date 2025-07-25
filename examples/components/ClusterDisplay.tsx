import { EmbeddingWithSource, FaceSource } from 'facenet-js/react';
import { useCallback, useState } from 'react';
import { ClusterResult, FaceCluster } from '../../src/FaceClusterer';

interface ClusterDisplayProps {
  clusters: ClusterResult;
  embeddingsWithSource: EmbeddingWithSource[];
  photos: FaceSource[];
  onClusterTag?: (clusterId: string, tag: string) => void;
  clusterTags?: Record<string, string>;
}

interface ClusterCardProps {
  cluster: FaceCluster;
  embeddingsWithSource: EmbeddingWithSource[];
  photos: FaceSource[];
  clusterIndex: number;
  onClusterTag?: (clusterId: string, tag: string) => void;
  clusterTag?: string;
}

const ClusterCard = ({ cluster, embeddingsWithSource, photos, clusterIndex, onClusterTag, clusterTag }: ClusterCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTag, setEditingTag] = useState(clusterTag || '');

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

  const clusterPhotos = cluster.memberIndices.map(memberIndex => {
    const embeddingWithSource = embeddingsWithSource[memberIndex];
    if (embeddingWithSource) {
      const photo = photos[embeddingWithSource.sourceIndex];
      return {
        photo,
        embeddingWithSource,
        memberIndex
      };
    }
    return null;
  }).filter(Boolean);

  const uniquePhotos = clusterPhotos.reduce((acc, item) => {
    if (!item) { return acc; }
    const existingPhoto = acc.find(p => p.photo.id === item.photo.id);
    if (!existingPhoto) {
      acc.push(item);
    }
    return acc;
  }, [] as NonNullable<typeof clusterPhotos[0]>[]);

  const confidencePercentage = Math.round(cluster.confidence * 100);
  const confidenceColor =
    cluster.confidence >= 0.8 ? 'text-green-600' :
      cluster.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  const clusterColors = [
    'border-purple-200 bg-purple-50',
    'border-blue-200 bg-blue-50',
    'border-green-200 bg-green-50',
    'border-orange-200 bg-orange-50',
    'border-pink-200 bg-pink-50',
    'border-indigo-200 bg-indigo-50',
    'border-teal-200 bg-teal-50',
    'border-red-200 bg-red-50',
  ];

  const colorClass = clusterColors[clusterIndex % clusterColors.length];

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editingTag}
                onChange={(e) => setEditingTag(e.target.value)}
                placeholder="Enter person name..."
                className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTag();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button
                onClick={handleSaveTag}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-800">
                {clusterTag || `Person ${String.fromCharCode(65 + clusterIndex)}`}
              </h4>
              {onClusterTag && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
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
          <span className="text-gray-500">
            {cluster.size} face{cluster.size !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Photo grid */}
      <div className="space-y-3">
        <div className={`grid gap-2 ${uniquePhotos.length === 1 ? 'grid-cols-1' : uniquePhotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {uniquePhotos.slice(0, isExpanded ? uniquePhotos.length : 3).map((item, index) => (
            <div key={`${item.photo.id}-${index}`} className="relative group">
              <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
                <img
                  src={item.photo.image.src}
                  alt={`Person ${String.fromCharCode(65 + clusterIndex)} - Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Face count indicator if multiple faces from same photo */}
              {clusterPhotos.filter(p => p?.photo.id === item.photo.id).length > 1 && (
                <div className="absolute top-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                  {clusterPhotos.filter(p => p?.photo.id === item.photo.id).length} faces
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Expand/Collapse button */}
        {uniquePhotos.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {isExpanded ? 'Show Less' : `Show ${uniquePhotos.length - 3} More`}
          </button>
        )}
      </div>

      {/* Cluster details */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
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

const OutlierCard = ({ embeddingsWithSource, photos }: { embeddingsWithSource: EmbeddingWithSource[], photos: FaceSource[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const outlierPhotos = embeddingsWithSource.map(embeddingWithSource => {
    const photo = photos[embeddingWithSource.sourceIndex];
    return { photo, embeddingWithSource };
  });

  const uniquePhotos = outlierPhotos.reduce((acc, item) => {
    const existingPhoto = acc.find(p => p.photo.id === item.photo.id);
    if (!existingPhoto) {
      acc.push(item);
    }
    return acc;
  }, [] as typeof outlierPhotos);

  if (uniquePhotos.length === 0) return null;

  return (
    <div className="border border-gray-300 bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">Unique Faces</h4>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">
            {embeddingsWithSource.length} face{embeddingsWithSource.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`grid gap-2 ${uniquePhotos.length === 1 ? 'grid-cols-1' : uniquePhotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {uniquePhotos.slice(0, isExpanded ? uniquePhotos.length : 3).map((item, index) => (
            <div key={`outlier-${item.photo.id}-${index}`} className="relative group">
              <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
                <img
                  src={item.photo.image.src}
                  alt={`Unique face ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Face count indicator if multiple faces from same photo */}
              {outlierPhotos.filter(p => p.photo.id === item.photo.id).length > 1 && (
                <div className="absolute top-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                  {outlierPhotos.filter(p => p.photo.id === item.photo.id).length} faces
                </div>
              )}
            </div>
          ))}
        </div>

        {uniquePhotos.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {isExpanded ? 'Show Less' : `Show ${uniquePhotos.length - 3} More`}
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          These faces don't match closely enough to form clusters with the current similarity threshold.
        </p>
      </div>
    </div>
  );
};

export const ClusterDisplay = ({ clusters, embeddingsWithSource, photos, onClusterTag, clusterTags }: ClusterDisplayProps) => {
  if (!clusters || clusters.clusters.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
        <div className="text-gray-400 text-4xl mb-2">🤷</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Clusters Found</h3>
        <p className="text-gray-600 text-sm">
          Try adjusting the similarity threshold or use a different clustering algorithm.
        </p>
      </div>
    );
  }
  const outlierEmbeddings = clusters.outliers.map(outlierIndex =>
    embeddingsWithSource[outlierIndex]
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Face Clusters</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clusters.clusters.map((cluster, index) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              embeddingsWithSource={embeddingsWithSource}
              photos={photos}
              clusterIndex={index}
              onClusterTag={onClusterTag}
              clusterTag={clusterTags?.[cluster.id]}
            />
          ))}
        </div>
      </div>

      {outlierEmbeddings.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Unclustered Faces</h3>
          <OutlierCard embeddingsWithSource={outlierEmbeddings} photos={photos} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <span className="font-medium text-gray-600 block">Algorithm:</span>
          <div className="text-gray-800 font-semibold">{clusters.algorithm}</div>
          <div className="text-xs text-gray-500 mt-1">
            {clusters.algorithm === 'DBSCAN' && 'Density-based clustering'}
            {clusters.algorithm === 'KMEANS' && 'Centroid-based clustering'}
            {clusters.algorithm === 'HIERARCHICAL' && 'Tree-based clustering'}
            {clusters.algorithm === 'OPTICS' && 'Density-based with varying densities'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <span className="font-medium text-gray-600 block">Similarity Threshold:</span>
          <div className="text-gray-800 font-semibold">{clusters.options.threshold}</div>
          <div className="text-xs text-gray-500 mt-1">
            {(clusters.options.threshold || 0.7) >= 0.8 ? 'Very strict matching' :
              (clusters.options.threshold || 0.7) >= 0.7 ? 'Balanced matching' :
                (clusters.options.threshold || 0.7) >= 0.6 ? 'Moderate matching' : 'Loose matching'}
          </div>
        </div>
        {clusters.options.minSamples && (
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="font-medium text-gray-600 block">Min Cluster Size:</span>
            <div className="text-gray-800 font-semibold">{clusters.options.minSamples}</div>
            <div className="text-xs text-gray-500 mt-1">
              Minimum faces needed to form a cluster
            </div>
          </div>
        )}
        {clusters.options.maxClusters && (
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="font-medium text-gray-600 block">Max Clusters:</span>
            <div className="text-gray-800 font-semibold">{clusters.options.maxClusters}</div>
            <div className="text-xs text-gray-500 mt-1">
              Upper limit on cluster count
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <h5 className="font-medium text-green-800 mb-1">Clustering Performance</h5>
        <div className="text-sm text-green-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Clustered:</span> {clusters.clusters.reduce((sum, c) => sum + c.size, 0)} faces ({Math.round((clusters.clusters.reduce((sum, c) => sum + c.size, 0) / (clusters.clusters.reduce((sum, c) => sum + c.size, 0) + clusters.outliers.length)) * 100)}%)
            </div>
            <div>
              <span className="font-medium">Outliers:</span> {clusters.outliers.length} faces ({Math.round((clusters.outliers.length / (clusters.clusters.reduce((sum, c) => sum + c.size, 0) + clusters.outliers.length)) * 100)}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};