import type { ClusterResult } from 'facenet-js';
import type { EmbeddingWithSource, FaceSource } from 'facenet-js/react';
import { ClusterCard } from './ClusterCard';
import { OutlierCard } from './OutlierCard';

const algorithmDescriptions: Record<ClusterResult['algorithm'], string> = {
  DBSCAN: 'Density-based clustering',
  KMEANS: 'Centroid-based clustering',
  HIERARCHICAL: 'Tree-based clustering',
  OPTICS: 'Density-based with varying densities',
};

interface ClusterDisplayProps {
  clusters: ClusterResult;
  embeddingsWithSource: EmbeddingWithSource[];
  photos: FaceSource[];
  onClusterTag?: (clusterId: string, tag: string) => void;
  clusterTags?: Record<string, string>;
  selectedClusterId?: string | null;
  onClusterSelect?: (clusterId: string) => void;
}

const getThresholdDescription = (threshold = 0.7) => {
  if (threshold >= 0.8) {
    return 'Very strict matching';
  }

  if (threshold >= 0.7) {
    return 'Balanced matching';
  }

  if (threshold >= 0.6) {
    return 'Moderate matching';
  }

  return 'Loose matching';
};

export const ClusterDisplay = ({
  clusters,
  embeddingsWithSource,
  photos,
  onClusterTag,
  clusterTags,
  selectedClusterId,
  onClusterSelect,
}: ClusterDisplayProps) => {
  const outlierEmbeddings = clusters.outliers.reduce<EmbeddingWithSource[]>(
    (items, outlierIndex) => {
      const embeddingWithSource = embeddingsWithSource[outlierIndex];
      if (embeddingWithSource) {
        items.push(embeddingWithSource);
      }

      return items;
    },
    []
  );
  const clusteredFaceCount = clusters.clusters.reduce((sum, cluster) => sum + cluster.size, 0);
  const processedFaceCount = clusteredFaceCount + clusters.outliers.length;
  const clusteredPercentage =
    processedFaceCount > 0 ? Math.round((clusteredFaceCount / processedFaceCount) * 100) : 0;
  const outlierPercentage =
    processedFaceCount > 0 ? Math.round((clusters.outliers.length / processedFaceCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="demo-card p-4">
        {clusters.clusters.length > 0 ? (
          <>
            <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-4">Face Clusters</h3>
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
                  isSelected={cluster.id === selectedClusterId}
                  onClusterSelect={onClusterSelect}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-2">
              No Clusters Found
            </h3>
            <p className="demo-subtle text-sm max-w-2xl mx-auto">
              The demo found {clusters.totalEmbeddings} face embedding
              {clusters.totalEmbeddings !== 1 ? 's' : ''}, but none were similar enough to form a
              cluster with the current threshold and minimum cluster size.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm text-left">
              <div className="demo-callout demo-callout-warning p-3">
                Lower the similarity threshold.
              </div>
              <div className="demo-callout demo-callout-info p-3">
                Capture clearer, front-lit angles.
              </div>
              <div className="demo-callout demo-callout-success p-3">
                Try Hierarchical or K-Means.
              </div>
            </div>
          </div>
        )}
      </div>

      {outlierEmbeddings.length > 0 && (
        <div className="demo-card p-4">
          <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-4">Unclustered Faces</h3>
          <OutlierCard embeddingsWithSource={outlierEmbeddings} photos={photos} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="demo-stat">
          <span className="font-medium demo-subtle block">Algorithm:</span>
          <div className="text-[var(--demo-text)] font-semibold">{clusters.algorithm}</div>
          <div className="text-xs demo-subtle mt-1">
            {algorithmDescriptions[clusters.algorithm]}
          </div>
        </div>
        <div className="demo-stat">
          <span className="font-medium demo-subtle block">Similarity Threshold:</span>
          <div className="text-[var(--demo-text)] font-semibold demo-numeric">
            {clusters.options.threshold}
          </div>
          <div className="text-xs demo-subtle mt-1">
            {getThresholdDescription(clusters.options.threshold)}
          </div>
        </div>
        {clusters.options.minSamples && (
          <div className="demo-stat">
            <span className="font-medium demo-subtle block">Min Cluster Size:</span>
            <div className="text-[var(--demo-text)] font-semibold demo-numeric">
              {clusters.options.minSamples}
            </div>
            <div className="text-xs demo-subtle mt-1">Minimum faces needed to form a cluster</div>
          </div>
        )}
        {clusters.options.maxClusters && (
          <div className="demo-stat">
            <span className="font-medium demo-subtle block">Max Clusters:</span>
            <div className="text-[var(--demo-text)] font-semibold demo-numeric">
              {clusters.options.maxClusters}
            </div>
            <div className="text-xs demo-subtle mt-1">Upper limit on cluster count</div>
          </div>
        )}
      </div>

      <div className="demo-callout demo-callout-success mt-4 p-3">
        <h5 className="font-medium mb-1">Clustering Performance</h5>
        <div className="text-sm demo-numeric">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Clustered:</span> {clusteredFaceCount} faces (
              {clusteredPercentage}%)
            </div>
            <div>
              <span className="font-medium">Outliers:</span> {clusters.outliers.length} faces (
              {outlierPercentage}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
