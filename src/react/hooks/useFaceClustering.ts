import { useMemo } from 'react';
import {
  DEFAULT_OPTIONS,
  FaceClusterer,
  ClusteringOptions,
  ClusterResult,
} from '../../FaceClusterer';
import { Embedding, EmbeddingResult } from '../../types';

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
  options: ClusteringOptions = {}
): {
  /** Clustering result containing clusters and outliers */
  clusters: ClusterResult | null;
  /** Whether clustering computation is in progress */
  isLoading: boolean;
  /** Error that occurred during clustering, if any */
  error: Error | null;
} => {
  const algorithm = options.algorithm ?? DEFAULT_OPTIONS.algorithm;
  const threshold = options.threshold ?? DEFAULT_OPTIONS.threshold;
  const minSamples = options.minSamples ?? DEFAULT_OPTIONS.minSamples;
  const maxClusters = options.maxClusters ?? DEFAULT_OPTIONS.maxClusters;
  const distanceMetric = options.distanceMetric ?? DEFAULT_OPTIONS.distanceMetric;

  const result = useMemo(() => {
    const resolvedOptions: Required<ClusteringOptions> = {
      algorithm,
      threshold,
      minSamples,
      maxClusters,
      distanceMetric,
    };

    if (!embeddings || embeddings.length === 0) {
      return { clusters: null, isLoading: false, error: null };
    }

    if (embeddings.length === 1) {
      const emptyEmbedding: Embedding = {
        floatEmbedding: [],
        headIndex: 0,
        headName: 'single_face',
      };
      const singleCluster: ClusterResult = {
        clusters: [
          {
            id: '0',
            memberIndices: [0],
            centroid: embeddings[0]?.embeddings?.[0] ?? emptyEmbedding,
            confidence: 1.0,
            size: 1,
          },
        ],
        outliers: [],
        algorithm: resolvedOptions.algorithm,
        totalEmbeddings: 1,
        options: resolvedOptions,
      };
      return { clusters: singleCluster, isLoading: false, error: null };
    }
    try {
      const clusterer = new FaceClusterer(resolvedOptions);
      const clusterResult = clusterer.cluster(embeddings);
      return { clusters: clusterResult, isLoading: false, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { clusters: null, isLoading: false, error };
    }
  }, [algorithm, distanceMetric, embeddings, maxClusters, minSamples, threshold]);

  return result;
};
