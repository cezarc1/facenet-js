import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMultiFaceEmbeddings } from '../../src/react/hooks/useMultiFaceEmbeddings';
import type { FaceSource, Detection, EmbeddingResult } from '../../src/types';

// Mock useFaceDetector hook
const mockFaceDetector = {
  detectFromImage: vi.fn(),
  embed: vi.fn(),
  initialize: vi.fn(),
  state: 'initialized'
};

vi.mock('../../src/react/hooks/useFaceDetection', () => ({
  useFaceDetector: () => ({
    faceDetector: mockFaceDetector,
    isLoading: false,
    error: null
  })
}));

// Helper functions
const createMockImage = (src: string = 'mock-image.jpg'): HTMLImageElement => {
  const img = new Image();
  img.src = src;
  return img;
};

const createMockDetection = (score: number = 0.9): Detection => ({
  categories: [{ score, index: 0, categoryName: 'face', displayName: 'Face' }],
  boundingBox: { originX: 0, originY: 0, width: 100, height: 100 }
});

const createMockEmbedding = (values: number[]): EmbeddingResult => ({
  embeddings: [{
    floatEmbedding: values,
    headIndex: 0,
    headName: 'face'
  }]
});

describe('useMultiFaceEmbeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockFaceDetector.detectFromImage.mockResolvedValue([
      createMockDetection(0.9),
      createMockDetection(0.8)
    ]);
    
    mockFaceDetector.embed.mockResolvedValue(
      createMockEmbedding([1, 0, 0, 1])
    );
  });

  it('should return empty results for empty sources array', () => {
    const { result } = renderHook(() => useMultiFaceEmbeddings([]));

    expect(result.current.embeddings).toHaveLength(0);
    expect(result.current.embeddingsWithSource).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toEqual({ current: 0, total: 0, percentage: 0 });
  });

  it('should process single image source successfully', async () => {
    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'image1' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    // Wait for processing to complete
    await waitFor(() => {
      return result.current.isLoading === false;
    });

    expect(result.current.embeddings).toHaveLength(2); // 2 faces detected
    expect(result.current.embeddingsWithSource).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(result.current.progress.percentage).toBe(100);

    // Verify embedding metadata
    const embeddingWithSource = result.current.embeddingsWithSource[0];
    expect(embeddingWithSource.sourceIndex).toBe(0);
    expect(embeddingWithSource.detectionIndex).toBe(0);
    expect(embeddingWithSource.sourceId).toBe('image1');
  });

  it('should process multiple image sources', async () => {
    const sources: FaceSource[] = [
      { image: createMockImage('image1.jpg'), id: 'img1' },
      { image: createMockImage('image2.jpg'), id: 'img2' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    expect(result.current.embeddings).toHaveLength(4); // 2 images × 2 faces each
    expect(result.current.embeddingsWithSource).toHaveLength(4);
    expect(result.current.error).toBeNull();

    // Verify sources are tracked correctly
    const sourceIndices = result.current.embeddingsWithSource.map(e => e.sourceIndex);
    expect(sourceIndices).toContain(0);
    expect(sourceIndices).toContain(1);

    const sourceIds = result.current.embeddingsWithSource.map(e => e.sourceId);
    expect(sourceIds).toContain('img1');
    expect(sourceIds).toContain('img2');
  });

  it('should handle sources with pre-detected faces', async () => {
    const preDetections = [
      createMockDetection(0.95)
    ];

    const sources: FaceSource[] = [
      { 
        image: createMockImage(), 
        id: 'predetected',
        detections: preDetections
      }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    // Should use pre-detected faces instead of detecting again
    expect(mockFaceDetector.detectFromImage).not.toHaveBeenCalled();
    expect(result.current.embeddings).toHaveLength(1);
    expect(result.current.embeddingsWithSource[0].detectionIndex).toBe(0);
  });

  it('should handle face detection errors gracefully', async () => {
    mockFaceDetector.detectFromImage.mockRejectedValueOnce(
      new Error('Detection failed')
    );

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'error-image' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    // Should continue processing despite error
    expect(result.current.embeddings).toHaveLength(0);
    expect(result.current.error).toBeNull(); // Graceful handling
    expect(result.current.progress.percentage).toBe(100);
  });

  it('should handle embedding generation errors gracefully', async () => {
    mockFaceDetector.embed.mockRejectedValueOnce(
      new Error('Embedding failed')
    );

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'embed-error' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    // Should handle embedding errors gracefully
    expect(result.current.embeddings.length).toBeLessThan(2); // Some embeddings may fail
    expect(result.current.error).toBeNull(); // Graceful handling
  });

  it('should update progress correctly during processing', async () => {
    const sources: FaceSource[] = [
      { image: createMockImage('img1.jpg'), id: 'img1' },
      { image: createMockImage('img2.jpg'), id: 'img2' },
      { image: createMockImage('img3.jpg'), id: 'img3' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    // Should start with 0% progress
    expect(result.current.progress.current).toBe(0);
    expect(result.current.progress.total).toBe(3);
    expect(result.current.progress.percentage).toBe(0);

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    // Should end with 100% progress
    expect(result.current.progress.current).toBe(3);
    expect(result.current.progress.total).toBe(3);
    expect(result.current.progress.percentage).toBe(100);
  });

  it('should handle detector loading state', () => {
    // Mock detector as loading
    const loadingDetector = {
      faceDetector: null,
      isLoading: true,
      error: null
    };

    vi.mocked(require('../../src/react/hooks/useFaceDetection').useFaceDetector)
      .mockReturnValueOnce(loadingDetector);

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'test' }
    ];

    const { result } = renderHook(() => useMultiFaceEmbeddings(sources));

    expect(result.current.embeddings).toHaveLength(0);
    expect(result.current.isLoading).toBe(false); // Not processing because detector not ready
    expect(result.current.progress).toEqual({ current: 0, total: 0, percentage: 0 });
  });

  it('should handle detector error state', () => {
    // Mock detector with error
    const errorDetector = {
      faceDetector: null,
      isLoading: false,
      error: new Error('Detector initialization failed')
    };

    vi.mocked(require('../../src/react/hooks/useFaceDetection').useFaceDetector)
      .mockReturnValueOnce(errorDetector);

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'test' }
    ];

    const { result } = renderHook(() => useMultiFaceEmbeddings(sources));

    expect(result.current.embeddings).toHaveLength(0);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Detector initialization failed');
  });

  it('should handle images with no detected faces', async () => {
    mockFaceDetector.detectFromImage.mockResolvedValue([]); // No faces

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'no-faces' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    expect(result.current.embeddings).toHaveLength(0);
    expect(result.current.embeddingsWithSource).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.progress.percentage).toBe(100);
  });

  it('should handle null/undefined embedding results', async () => {
    mockFaceDetector.embed.mockResolvedValue(null);

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'null-embedding' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    expect(result.current.embeddings).toHaveLength(0);
    expect(result.current.embeddingsWithSource).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('should restart processing when sources change', async () => {
    const sources1: FaceSource[] = [
      { image: createMockImage('img1.jpg'), id: 'img1' }
    ];

    const sources2: FaceSource[] = [
      { image: createMockImage('img2.jpg'), id: 'img2' },
      { image: createMockImage('img3.jpg'), id: 'img3' }
    ];

    const { result, rerender, waitFor } = renderHook(
      ({ sources }) => useMultiFaceEmbeddings(sources),
      { initialProps: { sources: sources1 } }
    );

    // Wait for first processing
    await waitFor(() => {
      return result.current.isLoading === false;
    });

    expect(result.current.embeddings).toHaveLength(2); // 1 image × 2 faces

    // Change sources
    rerender({ sources: sources2 });

    // Wait for new processing
    await waitFor(() => {
      return result.current.isLoading === false;
    });

    expect(result.current.embeddings).toHaveLength(4); // 2 images × 2 faces each
  });

  it('should handle mixed successful and failed embeddings', async () => {
    let callCount = 0;
    mockFaceDetector.embed.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 0) {
        throw new Error('Embedding failed');
      }
      return Promise.resolve(createMockEmbedding([1, 0, 0, 1]));
    });

    const sources: FaceSource[] = [
      { image: createMockImage(), id: 'mixed-results' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    // Should have some embeddings (successful ones)
    expect(result.current.embeddings.length).toBeGreaterThan(0);
    expect(result.current.embeddings.length).toBeLessThan(2); // Not all succeeded
    expect(result.current.error).toBeNull(); // Graceful handling
  });

  it('should maintain source metadata accurately', async () => {
    const sources: FaceSource[] = [
      { image: createMockImage('family1.jpg'), id: 'family-photo-1' },
      { image: createMockImage('family2.jpg'), id: 'family-photo-2' }
    ];

    const { result, waitFor } = renderHook(() => useMultiFaceEmbeddings(sources));

    await waitFor(() => {
      return result.current.isLoading === false;
    });

    result.current.embeddingsWithSource.forEach((embeddingWithSource, index) => {
      expect(embeddingWithSource.sourceIndex).toBeGreaterThanOrEqual(0);
      expect(embeddingWithSource.sourceIndex).toBeLessThan(sources.length);
      expect(embeddingWithSource.detectionIndex).toBeGreaterThanOrEqual(0);
      expect(['family-photo-1', 'family-photo-2']).toContain(embeddingWithSource.sourceId);
      expect(embeddingWithSource.embedding).toBeDefined();
    });
  });
});