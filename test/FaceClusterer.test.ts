import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaceClusterer } from '../src/FaceClusterer';
import type { ClusteringOptions, EmbeddingResult } from '../src/types';

// Mock the clustering libraries
vi.mock('density-clustering', () => ({
  DBSCAN: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation((dataset) => {
        if (dataset.length >= 4) {
          return [[0, 1], [2, 3]];
        }
        if (dataset.length >= 2) {
          return [[0, 1]];
        }
        return dataset.length === 1 ? [[0]] : [];
      }),
    };
  }),
  OPTICS: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation((dataset) => {
        if (dataset.length >= 2) {
          return [[0, 1]];
        }
        return dataset.length === 1 ? [[0]] : [];
      }),
    };
  }),
  KMEANS: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation((dataset) => {
        if (dataset.length >= 4) {
          return [[0, 2], [1, 3]];
        }
        if (dataset.length >= 2) {
          return [[0, 1]];
        }
        return dataset.length === 1 ? [[0]] : [];
      }),
    };
  })
}));

vi.mock('ml-hclust', () => ({
  agnes: vi.fn().mockReturnValue({
    cut: vi.fn().mockReturnValue([0, 0, 1, 1]) // Hierarchical result
  })
}));

// Helper function to create mock embeddings
const createMockEmbedding = (values: number[]): EmbeddingResult => ({
  embeddings: [{
    floatEmbedding: values,
    headIndex: 0,
    headName: 'face'
  }]
});

describe('FaceClusterer', () => {
  let clusterer: FaceClusterer;
  let mockEmbeddings: EmbeddingResult[];

  const defaultOptions: ClusteringOptions = {
    algorithm: 'DBSCAN',
    threshold: 0.7,
    minSamples: 2,
    maxClusters: 10
  };

  beforeEach(() => {
    clusterer = new FaceClusterer(defaultOptions);
    
    // Create mock embeddings with different face features
    mockEmbeddings = [
      createMockEmbedding([1, 0, 0, 1]), // Person A - face 1
      createMockEmbedding([1, 0, 0, 0.9]), // Person A - face 2 (similar)
      createMockEmbedding([0, 1, 1, 0]), // Person B - face 1
      createMockEmbedding([0, 0.9, 1, 0]) // Person B - face 2 (similar)
    ];
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      expect(clusterer).toBeDefined();
    });

    it('should set sensible defaults for missing options', () => {
      const minimalClusterer = new FaceClusterer({ algorithm: 'DBSCAN' });
      expect(minimalClusterer).toBeDefined();
    });

    it('should validate algorithm parameter', () => {
      expect(() => new FaceClusterer({ algorithm: 'INVALID' as any })).not.toThrow();
    });
  });

  describe('cluster method', () => {
    it('should throw error for empty embeddings array', () => {
      expect(() => clusterer.cluster([])).toThrow('No embeddings provided for clustering');
    });

    it('should throw error for null embeddings', () => {
      expect(() => clusterer.cluster(null as any)).toThrow('No embeddings provided for clustering');
    });

    it('should throw error for embeddings without valid vectors', () => {
      const invalidEmbeddings = [{ embeddings: [] }] as EmbeddingResult[];
      expect(() => clusterer.cluster(invalidEmbeddings)).toThrow('No valid embedding vectors found');
    });

    it('should successfully cluster valid embeddings with DBSCAN', () => {
      const result = clusterer.cluster(mockEmbeddings);
      
      expect(result).toBeDefined();
      expect(result.algorithm).toBe('DBSCAN');
      expect(result.totalEmbeddings).toBe(4);
      expect(result.clusters).toHaveLength(2);
      expect(Array.isArray(result.outliers)).toBe(true);
    });

    it('should handle single embedding', () => {
      const singleEmbedding = [mockEmbeddings[0]];
      const result = clusterer.cluster(singleEmbedding);
      
      expect(result.totalEmbeddings).toBe(1);
      expect(result.clusters.length).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent results for same input', () => {
      const result1 = clusterer.cluster(mockEmbeddings);
      const result2 = clusterer.cluster(mockEmbeddings);
      
      expect(result1.clusters.length).toBe(result2.clusters.length);
      expect(result1.totalEmbeddings).toBe(result2.totalEmbeddings);
    });
  });

  describe('static cluster method', () => {
    it('should work as convenience method', () => {
      const result = FaceClusterer.cluster(mockEmbeddings, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.algorithm).toBe('DBSCAN');
      expect(result.totalEmbeddings).toBe(4);
    });

    it('should produce same results as instance method', () => {
      const instanceResult = clusterer.cluster(mockEmbeddings);
      const staticResult = FaceClusterer.cluster(mockEmbeddings, defaultOptions);
      
      expect(instanceResult.clusters.length).toBe(staticResult.clusters.length);
      expect(instanceResult.totalEmbeddings).toBe(staticResult.totalEmbeddings);
    });
  });

  describe('clustering algorithms', () => {
    it('should handle DBSCAN algorithm', () => {
      const dbscanClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        threshold: 0.7,
        minSamples: 2
      });
      
      const result = dbscanClusterer.cluster(mockEmbeddings);
      expect(result.algorithm).toBe('DBSCAN');
    });

    it('should handle OPTICS algorithm', () => {
      const opticsClusterer = new FaceClusterer({
        algorithm: 'OPTICS',
        threshold: 0.7,
        minSamples: 2
      });
      
      const result = opticsClusterer.cluster(mockEmbeddings);
      expect(result.algorithm).toBe('OPTICS');
    });

    it('should handle K-means algorithm', () => {
      const kmeansClusterer = new FaceClusterer({
        algorithm: 'KMEANS',
        maxClusters: 3
      });
      
      const result = kmeansClusterer.cluster(mockEmbeddings);
      expect(result.algorithm).toBe('KMEANS');
    });

    it('should handle Hierarchical algorithm', () => {
      const hierarchicalClusterer = new FaceClusterer({
        algorithm: 'HIERARCHICAL',
        threshold: 0.7
      });
      
      const result = hierarchicalClusterer.cluster(mockEmbeddings);
      expect(result.algorithm).toBe('HIERARCHICAL');
    });

    it('should throw error for unsupported algorithm', () => {
      const invalidClusterer = new FaceClusterer({
        algorithm: 'INVALID_ALGORITHM' as any
      });
      
      expect(() => invalidClusterer.cluster(mockEmbeddings))
        .toThrow('Unsupported clustering algorithm: INVALID_ALGORITHM');
    });
  });

  describe('cluster validation', () => {
    it('should validate cluster structure', () => {
      const result = clusterer.cluster(mockEmbeddings);
      
      result.clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('memberIndices');
        expect(cluster).toHaveProperty('centroid');
        expect(cluster).toHaveProperty('confidence');
        expect(cluster).toHaveProperty('size');
        
        expect(typeof cluster.id).toBe('string');
        expect(Array.isArray(cluster.memberIndices)).toBe(true);
        expect(cluster.memberIndices.length).toBe(cluster.size);
        expect(typeof cluster.confidence).toBe('number');
        expect(cluster.confidence).toBeGreaterThanOrEqual(0);
        expect(cluster.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should ensure all member indices are valid', () => {
      const result = clusterer.cluster(mockEmbeddings);
      
      result.clusters.forEach(cluster => {
        cluster.memberIndices.forEach(index => {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(mockEmbeddings.length);
        });
      });
    });

    it('should not have overlapping clusters', () => {
      const result = clusterer.cluster(mockEmbeddings);
      
      const allMemberIndices = result.clusters.flatMap(cluster => cluster.memberIndices);
      const uniqueIndices = [...new Set(allMemberIndices)];
      
      // Each embedding should appear in at most one cluster
      expect(allMemberIndices.length).toBe(uniqueIndices.length);
    });
  });

  describe('clustering options', () => {
    it('should respect similarity threshold', () => {
      const strictClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        threshold: 0.95, // Very strict
        minSamples: 2
      });
      
      const looseClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        threshold: 0.3, // Very loose
        minSamples: 2
      });
      
      const strictResult = strictClusterer.cluster(mockEmbeddings);
      const looseResult = looseClusterer.cluster(mockEmbeddings);
      
      // Strict clustering should generally produce more clusters (or more outliers)
      expect(strictResult).toBeDefined();
      expect(looseResult).toBeDefined();
    });

    it('should respect minimum samples parameter', () => {
      const smallMinClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        threshold: 0.7,
        minSamples: 1
      });
      
      const largeMinClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        threshold: 0.7,
        minSamples: 5
      });
      
      const smallResult = smallMinClusterer.cluster(mockEmbeddings);
      const largeResult = largeMinClusterer.cluster(mockEmbeddings);
      
      expect(smallResult).toBeDefined();
      expect(largeResult).toBeDefined();
      // Large min samples should produce fewer clusters with our small dataset
      expect(largeResult.clusters.length).toBeLessThanOrEqual(smallResult.clusters.length);
    });

    it('should respect max clusters for K-means', () => {
      const kmeansClusterer = new FaceClusterer({
        algorithm: 'KMEANS',
        maxClusters: 2
      });
      
      const result = kmeansClusterer.cluster(mockEmbeddings);
      
      // K-means with max 2 clusters should not exceed that
      expect(result.clusters.length).toBeLessThanOrEqual(2);
    });
  });

  describe('distance metrics', () => {
    it('should handle cosine distance metric', () => {
      const cosineClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        distanceMetric: 'cosine'
      });
      
      const result = cosineClusterer.cluster(mockEmbeddings);
      expect(result).toBeDefined();
    });

    it('should handle euclidean distance metric', () => {
      const euclideanClusterer = new FaceClusterer({
        algorithm: 'DBSCAN',
        distanceMetric: 'euclidean'
      });
      
      const result = euclideanClusterer.cluster(mockEmbeddings);
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle embeddings with different dimensions', () => {
      const mixedEmbeddings = [
        createMockEmbedding([1, 0, 0]), // 3D
        createMockEmbedding([0, 1, 0, 0]) // 4D
      ];
      
      // Should not crash, though results may vary
      expect(() => clusterer.cluster(mixedEmbeddings)).not.toThrow();
    });

    it('should handle embeddings with zero vectors', () => {
      const zeroEmbeddings = [
        createMockEmbedding([0, 0, 0, 0]),
        createMockEmbedding([0, 0, 0, 0])
      ];
      
      const result = clusterer.cluster(zeroEmbeddings);
      expect(result).toBeDefined();
    });

    it('should handle embeddings with NaN values gracefully', () => {
      const nanEmbeddings = [
        createMockEmbedding([NaN, 0, 0, 1]),
        createMockEmbedding([1, 0, 0, NaN])
      ];
      
      expect(() => clusterer.cluster(nanEmbeddings)).toThrow('No valid embedding vectors found');
    });

    it('should preserve original indices when filtering invalid embeddings', () => {
      const mixedEmbeddings = [
        createMockEmbedding([NaN, 0, 0, 1]),
        createMockEmbedding([1, 0, 0, 1]),
        createMockEmbedding([1, 0, 0, 0.9])
      ];

      const result = clusterer.cluster(mixedEmbeddings);

      expect(result.totalEmbeddings).toBe(3);
      expect(result.clusters[0].memberIndices).toEqual([1, 2]);
      expect(result.outliers).toEqual([0]);
    });

    it('should handle very large embedding arrays', () => {
      const largeEmbeddings = Array.from({ length: 50 }, () => 
        createMockEmbedding([Math.random(), Math.random(), Math.random(), Math.random()])
      );
      
      const result = clusterer.cluster(largeEmbeddings);
      expect(result.totalEmbeddings).toBe(50);
    });
  });

  describe('performance considerations', () => {
    it('should complete clustering in reasonable time', () => {
      const start = Date.now();
      clusterer.cluster(mockEmbeddings);
      const duration = Date.now() - start;
      
      // Should complete within 1 second for small dataset
      expect(duration).toBeLessThan(1000);
    });

    it('should handle moderate dataset sizes', () => {
      const moderateEmbeddings = Array.from({ length: 20 }, (_, i) => 
        createMockEmbedding([i % 4, (i + 1) % 4, (i + 2) % 4, (i + 3) % 4])
      );
      
      const result = clusterer.cluster(moderateEmbeddings);
      expect(result.totalEmbeddings).toBe(20);
      expect(result.clusters.length).toBeGreaterThan(0);
    });
  });
});
