import { describe, expect, it } from 'vitest';
import type { EmbeddingResult, FaceCluster } from 'facenet-js';
import {
  calculateProfileSimilarity,
  createFaceSourceFromDataUrl,
  getFaceCropRect,
  getProfileClusteringDefaults,
  getProfileClusterCounts,
  validateImageFiles,
} from '../../examples/src/features/face-clustering/utils/profilePhotoHelpers';

type Embedding = FaceCluster['centroid'];

const createFile = (name: string, type: string, size = 1024) =>
  new File(['x'.repeat(size)], name, { type });

const createEmbedding = (values: number[]): Embedding => ({
  floatEmbedding: values,
  headIndex: 0,
  headName: 'face',
});

const createEmbeddingResult = (values: number[]): EmbeddingResult => ({
  embeddings: [createEmbedding(values)],
});

const createCluster = (values: number[]): FaceCluster => ({
  id: 'cluster-1',
  memberIndices: [0, 1],
  centroid: createEmbedding(values),
  confidence: 0.9,
  size: 2,
});

describe('profile photo helpers', () => {
  it('defaults the profile demo to one K-Means cluster', () => {
    expect(getProfileClusteringDefaults()).toEqual({
      algorithm: 'KMEANS',
      threshold: 0.6,
      minSamples: 2,
      maxClusters: 1,
      distanceMetric: 'cosine',
    });
  });

  it('accepts only supported image files within the remaining profile photo limit', () => {
    const files = [
      createFile('one.jpg', 'image/jpeg'),
      createFile('two.png', 'image/png'),
      createFile('three.gif', 'image/gif'),
      createFile('large.webp', 'image/webp', 11 * 1024 * 1024),
    ];

    const result = validateImageFiles(files, 2);

    expect(result.validFiles.map(file => file.name)).toEqual(['one.jpg', 'two.png']);
    expect(result.errors).toEqual([
      'Invalid file type: three.gif. Only JPG, PNG, and WebP are supported.',
      'File too large: large.webp. Maximum size is 10MB.',
    ]);
  });

  it('rejects uploads that would exceed the total profile photo limit', () => {
    const files = [
      createFile('one.jpg', 'image/jpeg'),
      createFile('two.jpg', 'image/jpeg'),
      createFile('three.jpg', 'image/jpeg'),
    ];

    const result = validateImageFiles(files, 2);

    expect(result.validFiles).toEqual([]);
    expect(result.errors).toEqual(['Too many photos. Maximum 20 photos allowed.']);
  });

  it('creates a face source from captured image data with a stable generated id', async () => {
    class LoadingImage {
      naturalWidth = 640;
      naturalHeight = 480;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private value = '';

      get src() {
        return this.value;
      }

      set src(value: string) {
        this.value = value;
        queueMicrotask(() => this.onload?.());
      }
    }

    const OriginalImage = globalThis.Image;
    globalThis.Image = class extends LoadingImage {} as typeof Image;

    try {
      await expect(createFaceSourceFromDataUrl('data:image/jpeg;base64,abc', 'capture-1')).resolves.toMatchObject({
        id: 'capture-1',
        image: {
          src: 'data:image/jpeg;base64,abc',
        },
      });
    } finally {
      globalThis.Image = OriginalImage;
    }
  });

  it('compares the selected cluster centroid with the current webcam embedding', () => {
    const result = calculateProfileSimilarity(
      createCluster([1, 0, 0]),
      createEmbeddingResult([0.8, 0.6, 0]),
      0.75
    );

    expect(result).toEqual({
      similarity: 0.8,
      isMatch: true,
      message: 'Profile Similarity: 0.800',
    });
  });

  it('returns null when either side has no usable floating-point embedding', () => {
    expect(calculateProfileSimilarity(null, createEmbeddingResult([1, 0, 0]))).toBeNull();
    expect(calculateProfileSimilarity(createCluster([1, 0, 0]), { embeddings: [] })).toBeNull();
    expect(
      calculateProfileSimilarity(
        createCluster([]),
        createEmbeddingResult([1, 0, 0])
      )
    ).toBeNull();
  });

  it('reports outliers even when no clusters are formed', () => {
    expect(
      getProfileClusterCounts({
        clusters: [],
        outliers: [0, 1, 2, 3, 4, 5],
        algorithm: 'DBSCAN',
        totalEmbeddings: 6,
        options: { threshold: 0.6, minSamples: 2 },
      })
    ).toEqual({
      clusters: 0,
      outliers: 6,
      totalFaces: 6,
      clusteredFaces: 0,
      hasClusterResult: true,
      hasSelectableClusters: false,
    });
  });

  it('builds a padded square crop around a detected face', () => {
    expect(
      getFaceCropRect(
        { originX: 100, originY: 50, width: 80, height: 120 },
        400,
        300,
        0.25
      )
    ).toEqual({
      sx: 50,
      sy: 20,
      size: 180,
    });
  });

  it('clamps the face crop to the source image bounds', () => {
    expect(
      getFaceCropRect(
        { originX: 0, originY: 0, width: 80, height: 80 },
        100,
        100,
        0.5
      )
    ).toEqual({
      sx: 0,
      sy: 0,
      size: 100,
    });
  });
});
