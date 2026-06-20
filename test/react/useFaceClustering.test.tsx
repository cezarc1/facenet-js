import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFaceClustering } from '../../src/react/hooks/useFaceClustering';
import type { EmbeddingResult, ClusteringOptions } from '../../src/types';

const faceClustererMocks = vi.hoisted(() => ({
  cluster: vi.fn(),
}));

vi.mock('../../src/FaceClusterer', () => ({
  DEFAULT_OPTIONS: {
    algorithm: 'DBSCAN',
    threshold: 0.6,
    minSamples: 2,
    maxClusters: 100,
    distanceMetric: 'cosine',
  },
  FaceClusterer: vi.fn().mockImplementation(function (options) {
    return {
    cluster: (embeddings: EmbeddingResult[]) => faceClustererMocks.cluster(embeddings, options),
    };
  }),
}));

// Helper function to create mock embeddings
const createMockEmbedding = (values: number[]): EmbeddingResult => ({
  embeddings: [{
    floatEmbedding: values,
    headIndex: 0,
    headName: 'face'
  }]
});

describe('useFaceClustering', () => {
  const defaultOptions: ClusteringOptions = {
    algorithm: 'DBSCAN',
    threshold: 0.7,
    minSamples: 2
  };

  beforeEach(() => {
    faceClustererMocks.cluster.mockReset();
    faceClustererMocks.cluster.mockImplementation((embeddings, options) => ({
      clusters: [
        {
          id: '0',
          memberIndices: [0, 1],
          centroid: { floatEmbedding: [1, 0, 0, 1], headIndex: 0, headName: 'cluster' },
          confidence: 0.85,
          size: 2
        }
      ],
      outliers: embeddings.length > 2 ? [2] : [],
      algorithm: options.algorithm,
      totalEmbeddings: embeddings.length,
      options
    }));
  });

  it('should return null for empty embeddings', () => {
    const { result } = renderHook(() => 
      useFaceClustering([], defaultOptions)
    );

    expect(result.current.clusters).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return null for null embeddings', () => {
    const { result } = renderHook(() => 
      useFaceClustering(null, defaultOptions)
    );

    expect(result.current.clusters).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle single embedding as single cluster', () => {
    const singleEmbedding = [createMockEmbedding([1, 0, 0, 1])];
    
    const { result } = renderHook(() => 
      useFaceClustering(singleEmbedding, defaultOptions)
    );

    expect(result.current.clusters).not.toBeNull();
    expect(result.current.clusters?.clusters).toHaveLength(1);
    expect(result.current.clusters?.clusters[0].size).toBe(1);
    expect(result.current.clusters?.clusters[0].confidence).toBe(1.0);
    expect(result.current.clusters?.outliers).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should successfully cluster multiple embeddings', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([1, 0, 0, 0.9]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const { result } = renderHook(() => 
      useFaceClustering(embeddings, defaultOptions)
    );

    expect(result.current.clusters).not.toBeNull();
    expect(result.current.clusters?.algorithm).toBe('DBSCAN');
    expect(result.current.clusters?.totalEmbeddings).toBe(3);
    expect(result.current.clusters?.clusters).toHaveLength(1);
    expect(result.current.clusters?.outliers).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle clustering errors gracefully', () => {
    faceClustererMocks.cluster.mockImplementationOnce(() => {
      throw new Error('Clustering failed');
    });

    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0]),
    ];

    const { result } = renderHook(() => 
      useFaceClustering(embeddings, defaultOptions)
    );

    expect(result.current.clusters).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Clustering failed');
  });

  it('should handle non-Error exceptions', () => {
    faceClustererMocks.cluster.mockImplementationOnce(() => {
      throw 'String error';
    });

    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0]),
    ];

    const { result } = renderHook(() => 
      useFaceClustering(embeddings, defaultOptions)
    );

    expect(result.current.clusters).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('String error');
  });

  it('should recalculate when embeddings change', () => {
    const embeddings1 = [createMockEmbedding([1, 0, 0, 1])];
    const embeddings2 = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const { result, rerender } = renderHook(
      ({ embeddings }) => useFaceClustering(embeddings, defaultOptions),
      { initialProps: { embeddings: embeddings1 } }
    );

    // Initial state with single embedding
    expect(result.current.clusters?.totalEmbeddings).toBe(1);

    // Update with multiple embeddings
    rerender({ embeddings: embeddings2 });
    
    // Should recalculate clustering
    expect(result.current.clusters?.totalEmbeddings).toBe(2);
  });

  it('should recalculate when options change', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const options1 = { algorithm: 'DBSCAN' as const, threshold: 0.7 };
    const options2 = { algorithm: 'HIERARCHICAL' as const, threshold: 0.8 };

    const { result, rerender } = renderHook(
      ({ options }) => useFaceClustering(embeddings, options),
      { initialProps: { options: options1 } }
    );

    // Initial clustering
    expect(result.current.clusters?.algorithm).toBe('DBSCAN');

    // Update options
    rerender({ options: options2 });
    
    // Should recalculate with new options
    expect(result.current.clusters).not.toBeNull();
  });

  it('should handle various clustering algorithms', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const algorithms: Array<ClusteringOptions['algorithm']> = [
      'DBSCAN', 'HIERARCHICAL', 'KMEANS', 'OPTICS'
    ];

    algorithms.forEach(algorithm => {
      const { result } = renderHook(() => 
        useFaceClustering(embeddings, { algorithm, threshold: 0.7 })
      );

      expect(result.current.clusters).not.toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  it('should memoize results for identical inputs', () => {
    const embeddings = [createMockEmbedding([1, 0, 0, 1])];
    
    const { result, rerender } = renderHook(() => 
      useFaceClustering(embeddings, defaultOptions)
    );

    const firstResult = result.current.clusters;

    // Rerender with same inputs
    rerender();

    const secondResult = result.current.clusters;

    // Results should be memoized (same reference)
    expect(firstResult).toBe(secondResult);
  });

  it('should not recluster when omitted options resolve to the same defaults', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const { rerender } = renderHook(() => useFaceClustering(embeddings));

    expect(faceClustererMocks.cluster).toHaveBeenCalledTimes(1);

    rerender();

    expect(faceClustererMocks.cluster).toHaveBeenCalledTimes(1);
  });

  it('should not recluster for inline options with identical resolved values', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const { rerender } = renderHook(
      ({ nonce }) => {
        void nonce;
        return useFaceClustering(embeddings, { threshold: 0.8, minSamples: 2 });
      },
      { initialProps: { nonce: 0 } }
    );

    expect(faceClustererMocks.cluster).toHaveBeenCalledTimes(1);

    rerender({ nonce: 1 });

    expect(faceClustererMocks.cluster).toHaveBeenCalledTimes(1);
  });

  it('should handle edge case with malformed embeddings', () => {
    const malformedEmbeddings = [
      { embeddings: [] }, // No embeddings array
      { embeddings: [{ floatEmbedding: [], headIndex: 0, headName: 'empty' }] } // Empty float array
    ] as EmbeddingResult[];

    const { result } = renderHook(() => 
      useFaceClustering(malformedEmbeddings, defaultOptions)
    );

    // Should handle gracefully, either with error or empty result
    expect(result.current.isLoading).toBe(false);
  });

  it('should accept partial options and apply defaults', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const { result } = renderHook(() =>
      useFaceClustering(embeddings, { threshold: 0.8 })
    );

    expect(result.current.error).toBeNull();
    expect(result.current.clusters?.options).toEqual({
      algorithm: 'DBSCAN',
      threshold: 0.8,
      minSamples: 2,
      maxClusters: 100,
      distanceMetric: 'cosine',
    });
  });

  it('should respect all clustering options', () => {
    const embeddings = [
      createMockEmbedding([1, 0, 0, 1]),
      createMockEmbedding([0, 1, 1, 0])
    ];

    const complexOptions: ClusteringOptions = {
      algorithm: 'DBSCAN',
      threshold: 0.85,
      minSamples: 3,
      maxClusters: 5,
      distanceMetric: 'euclidean'
    };

    const { result } = renderHook(() => 
      useFaceClustering(embeddings, complexOptions)
    );

    expect(result.current.clusters).not.toBeNull();
    expect(result.current.clusters?.options.threshold).toBe(0.85);
    expect(result.current.clusters?.options.minSamples).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('should handle rapid option changes without race conditions', () => {
    const embeddings = [createMockEmbedding([1, 0, 0, 1])];
    
    const { result, rerender } = renderHook(
      ({ threshold }) => useFaceClustering(embeddings, { 
        algorithm: 'DBSCAN', 
        threshold 
      }),
      { initialProps: { threshold: 0.5 } }
    );

    // Rapidly change threshold
    rerender({ threshold: 0.6 });
    rerender({ threshold: 0.7 });
    rerender({ threshold: 0.8 });

    // Should handle without errors
    expect(result.current.clusters).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
