import { useMemo } from 'react';
import { FaceClusterer, ClusteringOptions, ClusterResult } from '../../FaceClusterer';
import { EmbeddingResult } from '../../types';

/**
 * React hook for clustering face embeddings.
 *
 * @param embeddings - Array of face embeddings to cluster
 * @param options - Clustering configuration options
 * @returns Clustering result or null if no valid embeddings
 *
 * @example
 * ```tsx
 * const { clusters, isLoading, error } = useFaceClustering(embeddings, {
 *   algorithm: 'DBSCAN',
 *   threshold: 0.7,
 *   minSamples: 2
 * });
 *
 * if (clusters) {
 *   console.log(`Found ${clusters.clusters.length} face clusters`);
 * }
 * ```
 */
export const useFaceClustering = (
  embeddings: EmbeddingResult[] | null,
  options: Required<ClusteringOptions>
): {
  /** Clustering result containing clusters and outliers */
  clusters: ClusterResult | null;
  /** Whether clustering computation is in progress */
  isLoading: boolean;
  /** Error that occurred during clustering, if any */
  error: Error | null;
} => {
  const result = useMemo(() => {
    if (!embeddings || embeddings.length === 0) {
      return { clusters: null, isLoading: false, error: null };
    }

    if (embeddings.length === 1) {
      const singleCluster: ClusterResult = {
        clusters: [
          {
            id: '0',
            memberIndices: [0],
            centroid:
              embeddings[0]?.embeddings?.[0] ||
              ({
                floatEmbedding: [],
                headIndex: 0,
                headName: 'single_face',
              } as unknown as import('../../types').Embedding),
            confidence: 1.0,
            size: 1,
          },
        ],
        outliers: [],
        algorithm: options.algorithm,
        totalEmbeddings: 1,
        options,
      };
      return { clusters: singleCluster, isLoading: false, error: null };
    }
    const clusterer = useMemo(() => new FaceClusterer(options), [options]);
    const start = performance.now();
    const clusterResult = clusterer.cluster(embeddings);
    const end = performance.now();
    console.info(`Clustering took ${end - start}ms`);
    return { clusters: clusterResult, isLoading: false, error: null };
  }, [embeddings, options]);

  return result;
};
