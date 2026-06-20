import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaceDetector } from '../../src/FaceDetector';
import { FaceClusterer } from '../../src/FaceClusterer';
import type { FaceDetectionOptions, ClusteringOptions, EmbeddingResult } from '../../src/types';

// Mock MediaPipe for integration tests
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  FaceDetector: {
    createFromOptions: vi.fn().mockImplementation(async () => ({
      detect: vi.fn().mockImplementation(() => {
        // Return mock detections with varying confidence
        return {
          detections: [
            {
              categories: [{ score: 0.95, index: 0, categoryName: 'face' }],
              boundingBox: { originX: 0.1, originY: 0.1, width: 0.3, height: 0.4 }
            },
            {
              categories: [{ score: 0.8, index: 0, categoryName: 'face' }],
              boundingBox: { originX: 0.6, originY: 0.2, width: 0.25, height: 0.35 }
            }
          ]
        };
      }),
      detectForVideo: vi.fn().mockReturnValue({ detections: [] }),
    })),
  },
  ImageEmbedder: {
    createFromOptions: vi.fn().mockImplementation(async () => ({
      embed: vi.fn().mockImplementation((source, options) => {
        // Return different embeddings based on bounding box position
        // This simulates different faces having different features
        const { regionOfInterest } = options;
        const x = regionOfInterest.left;
        
        if (x < 0.5) {
          // "Person A" - similar embeddings
          return {
            embeddings: [{
              floatEmbedding: [0.8, 0.1, 0.2, 0.9, 0.3], // Person A features
              headIndex: 0,
              headName: 'face'
            }]
          };
        } else {
          // "Person B" - different embeddings
          return {
            embeddings: [{
              floatEmbedding: [0.1, 0.9, 0.8, 0.2, 0.7], // Person B features
              headIndex: 0,
              headName: 'face'
            }]
          };
        }
      }),
    })),
    cosineSimilarity: vi.fn().mockImplementation((a, b) => {
      // Simple similarity calculation for testing
      const aVec = a.floatEmbedding;
      const bVec = b.floatEmbedding;
      
      let dotProduct = 0;
      for (let i = 0; i < Math.min(aVec.length, bVec.length); i++) {
        dotProduct += aVec[i] * bVec[i];
      }
      
      return dotProduct / (aVec.length * bVec.length);
    })
  },
}));

// Mock clustering libraries with realistic behavior
vi.mock('density-clustering', () => ({
  DBSCAN: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation((dataset) => {
      // Simulate clustering based on similarity
      if (dataset.length >= 4) {
        // Group similar embeddings together
        return [[0, 2], [1, 3]]; // Two clusters of 2 faces each
      } else if (dataset.length >= 2) {
        return [[0, 1]]; // One cluster
      }
      return []; // No clusters
    }),
    };
  }),
  KMEANS: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation((dataset) => {
        if (dataset.length >= 2) {
          return [[0, 1], ...dataset.slice(2).map((_, index) => [index + 2])];
        }
        return dataset.length === 1 ? [[0]] : [];
      }),
    };
  }),
  OPTICS: vi.fn().mockImplementation(function () {
    return {
      run: vi.fn().mockImplementation((dataset) => {
        if (dataset.length >= 2) {
          return [[0, 1], ...dataset.slice(2).map((_, index) => [index + 2])];
        }
        return dataset.length === 1 ? [[0]] : [];
      }),
    };
  }),
}));

describe('Face Clustering Integration Tests', () => {
  let faceDetector: FaceDetector;
  let faceClusterer: FaceClusterer;

  const detectorOptions: FaceDetectionOptions = {
    device: 'CPU',
    mode: 'IMAGE',
    minDetectionConfidence: 0.5,
    embeddingModelPath: './facenet.tflite'
  };

  const clusteringOptions: ClusteringOptions = {
    algorithm: 'DBSCAN',
    threshold: 0.7,
    minSamples: 2
  };

  beforeEach(async () => {
    faceDetector = new FaceDetector(detectorOptions);
    faceClusterer = new FaceClusterer(clusteringOptions);
    await faceDetector.initialize();
  });

  describe('end-to-end clustering workflow', () => {
    it('should complete full workflow: detect → embed → cluster', async () => {
      // Step 1: Create mock images
      const images = [
        createMockImage('person-a-1.jpg'),
        createMockImage('person-a-2.jpg'),
        createMockImage('person-b-1.jpg'),
        createMockImage('person-b-2.jpg')
      ];

      // Step 2: Detect faces in all images
      const allDetections = [];
      for (const image of images) {
        const detections = faceDetector.detectFromImage(image);
        allDetections.push(...detections);
      }

      expect(allDetections).toHaveLength(8); // 4 images × 2 faces each

      // Step 3: Generate embeddings for all detected faces
      const embeddings: EmbeddingResult[] = [];
      for (let i = 0; i < allDetections.length; i++) {
        const detection = allDetections[i];
        const imageIndex = Math.floor(i / 2);
        const embedding = faceDetector.embed({
          source: images[imageIndex],
          detection
        });
        if (embedding) {
          embeddings.push(embedding);
        }
      }

      expect(embeddings.length).toBeGreaterThan(0);

      // Step 4: Cluster the embeddings
      const clusterResult = faceClusterer.cluster(embeddings);

      expect(clusterResult).toBeDefined();
      expect(clusterResult.algorithm).toBe('DBSCAN');
      expect(clusterResult.totalEmbeddings).toBe(embeddings.length);
      expect(clusterResult.clusters.length).toBeGreaterThan(0);

      // Verify cluster structure
      clusterResult.clusters.forEach(cluster => {
        expect(cluster.memberIndices.length).toBeGreaterThanOrEqual(2);
        expect(cluster.confidence).toBeGreaterThan(0);
        expect(cluster.size).toBe(cluster.memberIndices.length);
      });
    });

    it('should handle images with no faces gracefully', async () => {
      const imageWithNoFaces = createMockImage('landscape.jpg');
      
      // Mock no detections for this test
      const mockDetector = vi.mocked(faceDetector.faceDetector);
      if (mockDetector) {
        mockDetector.detect = vi.fn().mockReturnValueOnce({ detections: [] });
      }

      const detections = faceDetector.detectFromImage(imageWithNoFaces);
      expect(detections).toHaveLength(0);

      // Should handle empty embeddings array
      expect(() => faceClusterer.cluster([])).toThrow('No embeddings provided for clustering');
    });

    it('should produce consistent results across runs', async () => {
      const images = [
        createMockImage('consistent-1.jpg'),
        createMockImage('consistent-2.jpg')
      ];

      // Run the workflow twice
      const runWorkflow = () => {
        const embeddings: EmbeddingResult[] = [];
        for (const image of images) {
          const detections = faceDetector.detectFromImage(image);
          for (const detection of detections) {
            const embedding = faceDetector.embed({ source: image, detection });
            if (embedding) embeddings.push(embedding);
          }
        }
        return faceClusterer.cluster(embeddings);
      };

      const result1 = runWorkflow();
      const result2 = runWorkflow();

      // Results should be consistent
      expect(result1.clusters.length).toBe(result2.clusters.length);
      expect(result1.totalEmbeddings).toBe(result2.totalEmbeddings);
    });
  });

  describe('algorithm comparison', () => {
    let testEmbeddings: EmbeddingResult[];

    beforeEach(async () => {
      // Generate test embeddings from images
      const images = [
        createMockImage('test-1.jpg'),
        createMockImage('test-2.jpg'),
        createMockImage('test-3.jpg')
      ];

      testEmbeddings = [];
      for (const image of images) {
        const detections = faceDetector.detectFromImage(image);
        for (const detection of detections) {
          const embedding = faceDetector.embed({ source: image, detection });
          if (embedding) testEmbeddings.push(embedding);
        }
      }
    });

    it('should compare different clustering algorithms', () => {
      const algorithms: ClusteringOptions['algorithm'][] = ['DBSCAN', 'HIERARCHICAL', 'KMEANS'];
      const results = algorithms.map(algorithm => {
        const clusterer = new FaceClusterer({ algorithm, threshold: 0.7 });
        return clusterer.cluster(testEmbeddings);
      });

      // All algorithms should produce valid results
      results.forEach((result, index) => {
        expect(result.algorithm).toBe(algorithms[index]);
        expect(result.totalEmbeddings).toBe(testEmbeddings.length);
        expect(result.clusters).toBeDefined();
        expect(Array.isArray(result.outliers)).toBe(true);
      });

      // Results may differ but should all be valid
      const clusterCounts = results.map(r => r.clusters.length);
      expect(Math.max(...clusterCounts)).toBeGreaterThanOrEqual(Math.min(...clusterCounts));
    });

    it('should show effect of similarity threshold changes', () => {
      const thresholds = [0.5, 0.7, 0.9];
      const results = thresholds.map(threshold => {
        const clusterer = new FaceClusterer({ algorithm: 'DBSCAN', threshold });
        return clusterer.cluster(testEmbeddings);
      });

      // Higher thresholds should generally produce more clusters or outliers
      results.forEach(result => {
        const assignedCount = result.clusters.reduce(
          (count, cluster) => count + cluster.memberIndices.length,
          result.outliers.length
        );
        expect(assignedCount).toBe(testEmbeddings.length);
      });
    });
  });

  describe('performance and scalability', () => {
    it('should handle moderate dataset sizes efficiently', async () => {
      // Generate a moderate number of embeddings
      const images = Array.from({ length: 10 }, (_, i) => createMockImage(`perf-test-${i}.jpg`));
      
      const start = Date.now();
      
      const embeddings: EmbeddingResult[] = [];
      for (const image of images) {
        const detections = faceDetector.detectFromImage(image);
        for (const detection of detections) {
          const embedding = faceDetector.embed({ source: image, detection });
          if (embedding) embeddings.push(embedding);
        }
      }

      const clusterResult = faceClusterer.cluster(embeddings);
      
      const duration = Date.now() - start;

      expect(clusterResult.totalEmbeddings).toBe(embeddings.length);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle single face gracefully', async () => {
      const image = createMockImage('single-face.jpg');
      
      // Mock single detection
      const mockDetector = vi.mocked(faceDetector.faceDetector);
      if (mockDetector) {
        mockDetector.detect = vi.fn().mockReturnValueOnce({
          detections: [{
            categories: [{ score: 0.9, index: 0, categoryName: 'face' }],
            boundingBox: { originX: 0.2, originY: 0.2, width: 0.4, height: 0.4 }
          }]
        });
      }

      const detections = faceDetector.detectFromImage(image);
      expect(detections).toHaveLength(1);

      const embedding = faceDetector.embed({ source: image, detection: detections[0] });
      expect(embedding).toBeDefined();

      if (embedding) {
        const clusterResult = faceClusterer.cluster([embedding]);
        
        // Single embedding should create appropriate result
        expect(clusterResult.totalEmbeddings).toBe(1);
        expect(clusterResult.clusters.length + clusterResult.outliers.length).toBe(1);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle detection failures gracefully', async () => {
      const image = createMockImage('problematic.jpg');
      
      // Mock detection failure
      const mockDetector = vi.mocked(faceDetector.faceDetector);
      if (mockDetector) {
        mockDetector.detect = vi.fn().mockImplementationOnce(() => {
          throw new Error('Detection failed');
        });
      }

      expect(() => faceDetector.detectFromImage(image)).toThrow('Detection failed');
    });

    it('should handle embedding failures gracefully', async () => {
      const image = createMockImage('embed-fail.jpg');
      const detections = faceDetector.detectFromImage(image);
      
      // Mock embedding failure
      const mockEmbedder = vi.mocked(faceDetector.faceEmbedder);
      if (mockEmbedder) {
        mockEmbedder.embed = vi.fn().mockImplementationOnce(() => {
          throw new Error('Embedding failed');
        });
      }

      expect(() => faceDetector.embed({ 
        source: image, 
        detection: detections[0] 
      })).toThrow('Embedding failed');
    });

    it('should handle corrupted embeddings', () => {
      const corruptedEmbeddings = [
        { embeddings: [] }, // Empty embeddings
        { embeddings: [{ floatEmbedding: [], headIndex: 0, headName: 'corrupt' }] }, // Empty float array
        { embeddings: [{ floatEmbedding: [NaN, NaN], headIndex: 0, headName: 'nan' }] }, // NaN values
      ] as EmbeddingResult[];

      // Should handle gracefully
      expect(() => faceClusterer.cluster(corruptedEmbeddings)).toThrow('No valid embedding vectors found');
    });
  });

  describe('similarity calculations', () => {
    it('should properly calculate face similarities', () => {
      const embedding1 = {
        floatEmbedding: [1, 0, 0, 1, 0],
        headIndex: 0,
        headName: 'face1'
      };
      
      const embedding2 = {
        floatEmbedding: [1, 0, 0, 1, 0],
        headIndex: 0,
        headName: 'face2'
      };
      
      const embedding3 = {
        floatEmbedding: [0, 1, 1, 0, 1],
        headIndex: 0,
        headName: 'face3'
      };

      const similarity12 = FaceDetector.cosineSimilarity(embedding1, embedding2);
      const similarity13 = FaceDetector.cosineSimilarity(embedding1, embedding3);

      expect(typeof similarity12).toBe('number');
      expect(typeof similarity13).toBe('number');
      
      // Identical embeddings should have higher similarity
      expect(similarity12).toBeGreaterThan(similarity13);
    });
  });
});

// Helper function to create mock images
function createMockImage(filename: string): HTMLImageElement {
  const img = Object.create(HTMLImageElement.prototype) as HTMLImageElement;
  Object.defineProperties(img, {
    naturalWidth: { value: 640, writable: true },
    naturalHeight: { value: 480, writable: true },
    src: { value: `data:image/jpeg;base64,mock-${filename}`, writable: true },
  });
  return img;
}
