import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaceDetector } from '../src/FaceDetector';
import type { FaceDetectionOptions } from '../src/types';

const mediaPipeMocks = vi.hoisted(() => ({
  faceDetectorInstances: [] as {
    detect: ReturnType<typeof vi.fn>;
    detectForVideo: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }[],
  imageEmbedderInstances: [] as {
    embed: ReturnType<typeof vi.fn>;
    embedForVideo: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }[],
}));

// Mock HTML elements for testing
function createMockHTMLImageElement() {
  const img = Object.create(HTMLImageElement.prototype);
  Object.defineProperties(img, {
    naturalWidth: { value: 0, writable: true },
    naturalHeight: { value: 0, writable: true },
    width: { value: 0, writable: true },
    height: { value: 0, writable: true },
    src: { value: '', writable: true }
  });
  return img;
}

function createMockHTMLVideoElement() {
  const video = Object.create(HTMLVideoElement.prototype);
  Object.defineProperties(video, {
    videoWidth: { value: 0, writable: true },
    videoHeight: { value: 0, writable: true },
    width: { value: 0, writable: true },
    height: { value: 0, writable: true }
  });
  return video;
}

// Mock MediaPipe modules
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  FaceDetector: {
    createFromOptions: vi.fn().mockImplementation(() => {
      const instance = {
        detect: vi.fn().mockReturnValue({ detections: [] }),
        detectForVideo: vi.fn().mockReturnValue({ detections: [] }),
        close: vi.fn(),
      };
      mediaPipeMocks.faceDetectorInstances.push(instance);
      return Promise.resolve(instance);
    }),
  },
  ImageEmbedder: {
    createFromOptions: vi.fn().mockImplementation(() => {
      const instance = {
        embed: vi.fn().mockReturnValue({ embeddings: [new Float32Array(128)] }),
        embedForVideo: vi.fn().mockReturnValue({ embeddings: [new Float32Array(128)] }),
        close: vi.fn(),
      };
      mediaPipeMocks.imageEmbedderInstances.push(instance);
      return Promise.resolve(instance);
    }),
    cosineSimilarity: vi.fn().mockReturnValue(0.5),
  },
}));

describe('FaceDetector', () => {
  let detector: FaceDetector;
  const defaultOptions: FaceDetectionOptions = {
    device: 'CPU',
    mode: 'IMAGE',
    minDetectionConfidence: 0.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mediaPipeMocks.faceDetectorInstances.length = 0;
    mediaPipeMocks.imageEmbedderInstances.length = 0;
    detector = new FaceDetector(defaultOptions);
  });

  describe('constructor', () => {
    it('should create a new instance with provided options', () => {
      expect(detector).toBeDefined();
      expect(detector.state).toBe('not_initialized');
      expect(detector.error).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await detector.initialize();
      expect(detector.state).toBe('initialized');
      expect(detector.error).toBeNull();
    });

    it('uses the version-pinned MediaPipe wasm CDN path by default', async () => {
      const { FilesetResolver } = await import('@mediapipe/tasks-vision');

      await detector.initialize();

      expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await detector.initialize();
      const firstState = detector.state;
      await detector.initialize();
      expect(detector.state).toBe(firstState);
    });

    it('should close MediaPipe task handles and reset state idempotently', async () => {
      const detectorWithEmbedding = new FaceDetector({
        ...defaultOptions,
        embeddingModelPath: './facenet.tflite',
      });

      await detectorWithEmbedding.initialize();

      const faceDetectorTask = mediaPipeMocks.faceDetectorInstances[0];
      const imageEmbedderTask = mediaPipeMocks.imageEmbedderInstances[0];

      detectorWithEmbedding.close();
      detectorWithEmbedding.close();

      expect(faceDetectorTask.close).toHaveBeenCalledTimes(1);
      expect(imageEmbedderTask.close).toHaveBeenCalledTimes(1);
      expect(detectorWithEmbedding.state).toBe('not_initialized');
      expect(detectorWithEmbedding.error).toBeNull();
      expect(() =>
        detectorWithEmbedding.detectFromImage(createMockHTMLImageElement())
      ).toThrow('Face detector not initialized');
    });

    it('should close task handles created after cleanup during initialization', async () => {
      const detectorWithEmbedding = new FaceDetector({
        ...defaultOptions,
        embeddingModelPath: './facenet.tflite',
      });

      const initializePromise = detectorWithEmbedding.initialize();

      detectorWithEmbedding.close();
      await initializePromise;

      expect(mediaPipeMocks.faceDetectorInstances[0].close).toHaveBeenCalledTimes(1);
      expect(mediaPipeMocks.imageEmbedderInstances[0].close).toHaveBeenCalledTimes(1);
      expect(detectorWithEmbedding.state).toBe('not_initialized');
    });
  });

  describe('detectFromImage', () => {
    it('should throw error if not initialized', () => {
      const img = createMockHTMLImageElement();
      expect(() => detector.detectFromImage(img)).toThrow('Face detector not initialized');
    });

    it('should detect faces from image when initialized', async () => {
      await detector.initialize();
      const img = createMockHTMLImageElement();
      const detections = detector.detectFromImage(img);
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('detectFromVideo', () => {
    it('should throw error if not initialized', () => {
      const video = createMockHTMLVideoElement();
      expect(() => detector.detectFromVideo(video, 0)).toThrow('Face detector not initialized');
    });

    it('should detect faces from video when initialized', async () => {
      const videoDetector = new FaceDetector({
        ...defaultOptions,
        mode: 'VIDEO',
      });
      await videoDetector.initialize();
      const video = createMockHTMLVideoElement();
      const detections = videoDetector.detectFromVideo(video, 0);
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('embed', () => {
    it('should throw error if embedder not initialized', async () => {
      await detector.initialize();
      const img = createMockHTMLImageElement();
      const detection = { boundingBox: { originX: 0, originY: 0, width: 100, height: 100 } };
      expect(() => detector.embed({ source: img, detection: detection as any }))
        .toThrow('Face embedder not initialized');
    });

    it('should generate embeddings when properly initialized', async () => {
      const detectorWithEmbedding = new FaceDetector({
        ...defaultOptions,
        embeddingModelPath: './facenet.tflite'
      });
      await detectorWithEmbedding.initialize();
      
      const img = createMockHTMLImageElement();
      img.naturalWidth = 640;
      img.naturalHeight = 480;
      
      const detection = { 
        boundingBox: { originX: 0.1, originY: 0.1, width: 0.3, height: 0.4 },
        categories: [{ score: 0.9, index: 0, categoryName: 'face' }]
      };
      
      const result = detectorWithEmbedding.embed({ 
        source: img, 
        detection: detection as any 
      });
      
      expect(result).toBeDefined();
      expect(result.embeddings).toHaveLength(1);
    });

    it('should handle video embedding with timestamp', async () => {
      const videoDetector = new FaceDetector({
        ...defaultOptions,
        mode: 'VIDEO',
        embeddingModelPath: './facenet.tflite'
      });
      await videoDetector.initialize();
      
      const video = createMockHTMLVideoElement();
      video.videoWidth = 640;
      video.videoHeight = 480;
      
      const detection = { 
        boundingBox: { originX: 0.2, originY: 0.2, width: 0.4, height: 0.4 },
        categories: [{ score: 0.8, index: 0, categoryName: 'face' }]
      };
      
      const result = videoDetector.embed({ 
        source: video, 
        detection: detection as any,
        timestamp: 1000 
      });
      
      expect(result).toBeDefined();
    });

    it('should return null for detection without bounding box', async () => {
      const detectorWithEmbedding = new FaceDetector({
        ...defaultOptions,
        embeddingModelPath: './facenet.tflite'
      });
      await detectorWithEmbedding.initialize();
      
      const img = createMockHTMLImageElement();
      const detection = { categories: [{ score: 0.9, index: 0, categoryName: 'face' }] };
      
      const result = detectorWithEmbedding.embed({ 
        source: img, 
        detection: detection as any 
      });
      
      expect(result).toBeNull();
    });

    it('should validate mode compatibility for image embedding', async () => {
      const videoDetector = new FaceDetector({
        ...defaultOptions,
        mode: 'VIDEO',
        embeddingModelPath: './facenet.tflite'
      });
      await videoDetector.initialize();
      
      const img = createMockHTMLImageElement();
      const detection = { boundingBox: { originX: 0, originY: 0, width: 100, height: 100 } };
      
      expect(() => videoDetector.embed({ source: img, detection: detection as any }))
        .toThrow('Cannot embed image in video mode');
    });

    it('should validate mode compatibility for video embedding', async () => {
      const imageDetector = new FaceDetector({
        ...defaultOptions,
        mode: 'IMAGE',
        embeddingModelPath: './facenet.tflite'
      });
      await imageDetector.initialize();
      
      const video = createMockHTMLVideoElement();
      const detection = { boundingBox: { originX: 0, originY: 0, width: 100, height: 100 } };
      
      expect(() => imageDetector.embed({ source: video, detection: detection as any }))
        .toThrow('Cannot embed video in image mode');
    });

    it('should throw error for invalid source type', async () => {
      const detectorWithEmbedding = new FaceDetector({
        ...defaultOptions,
        embeddingModelPath: './facenet.tflite'
      });
      await detectorWithEmbedding.initialize();
      
      const invalidSource = document.createElement('div');
      const detection = { boundingBox: { originX: 0, originY: 0, width: 100, height: 100 } };
      
      expect(() => detectorWithEmbedding.embed({ 
        source: invalidSource as any, 
        detection: detection as any 
      })).toThrow('Invalid source type');
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity between embeddings', () => {
      const embedding1 = { floatEmbedding: [1, 0, 0], headIndex: 0, headName: 'face1' };
      const embedding2 = { floatEmbedding: [0, 1, 0], headIndex: 0, headName: 'face2' };
      
      const similarity = FaceDetector.cosineSimilarity(embedding1, embedding2);
      expect(typeof similarity).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock FilesetResolver to throw error
      const { FilesetResolver } = await import('@mediapipe/tasks-vision');
      vi.mocked(FilesetResolver.forVisionTasks).mockRejectedValueOnce(new Error('Network error'));
      
      const errorDetector = new FaceDetector(defaultOptions);
      
      await expect(errorDetector.initialize()).rejects.toThrow('Network error');
      expect(errorDetector.state).toBe('error');
      expect(errorDetector.error).toBeInstanceOf(Error);
    });

    it('should handle non-Error exceptions during initialization', async () => {
      const { FilesetResolver } = await import('@mediapipe/tasks-vision');
      vi.mocked(FilesetResolver.forVisionTasks).mockRejectedValueOnce('String error');
      
      const errorDetector = new FaceDetector(defaultOptions);
      
      await expect(errorDetector.initialize()).rejects.toThrow();
      expect(errorDetector.state).toBe('error');
      expect(errorDetector.error).toBeInstanceOf(Error);
    });

    it('should prevent operations when in error state', async () => {
      const errorDetector = new FaceDetector(defaultOptions);
      
      // Force error state
      const { FilesetResolver } = await import('@mediapipe/tasks-vision');
      vi.mocked(FilesetResolver.forVisionTasks).mockRejectedValueOnce(new Error('Init failed'));
      
      try {
        await errorDetector.initialize();
      } catch {
        // Expected to fail
      }
      
      const img = createMockHTMLImageElement();
      expect(() => errorDetector.detectFromImage(img))
        .toThrow('Face detector not initialized');
    });
  });

  describe('state management', () => {
    it('should track initialization state correctly', () => {
      expect(detector.state).toBe('not_initialized');
      expect(detector.error).toBeNull();
    });

    it('should update state during initialization', async () => {
      expect(detector.state).toBe('not_initialized');
      
      const initPromise = detector.initialize();
      // State should be 'initializing' during async initialization
      
      await initPromise;
      expect(detector.state).toBe('initialized');
    });

    it('should not allow multiple concurrent initializations', async () => {
      const promise1 = detector.initialize();
      const promise2 = detector.initialize();
      
      await Promise.all([promise1, promise2]);
      
      expect(detector.state).toBe('initialized');
    });
  });

  describe('configuration options', () => {
    it('should handle custom model paths', async () => {
      const customDetector = new FaceDetector({
        ...defaultOptions,
        detectionModelPath: './custom-detection-model.tflite',
        embeddingModelPath: './custom-embedding-model.tflite',
        wasmPath: './custom-wasm-path'
      });
      
      await customDetector.initialize();
      expect(customDetector.state).toBe('initialized');
    });

    it('should handle different device configurations', async () => {
      const gpuDetector = new FaceDetector({
        ...defaultOptions,
        device: 'GPU'
      });
      
      await gpuDetector.initialize();
      expect(gpuDetector.state).toBe('initialized');
    });

    it('should handle different confidence thresholds', async () => {
      const strictDetector = new FaceDetector({
        ...defaultOptions,
        minDetectionConfidence: 0.9
      });
      
      await strictDetector.initialize();
      
      const img = createMockHTMLImageElement();
      const detections = strictDetector.detectFromImage(img);
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('bounding box validation', () => {
    let detectorWithEmbedding: FaceDetector;

    beforeEach(async () => {
      detectorWithEmbedding = new FaceDetector({
        ...defaultOptions,
        embeddingModelPath: './facenet.tflite'
      });
      await detectorWithEmbedding.initialize();
    });

    it('should handle normalized bounding boxes', async () => {
      const img = createMockHTMLImageElement();
      img.naturalWidth = 640;
      img.naturalHeight = 480;
      
      const detection = { 
        boundingBox: { originX: 0.1, originY: 0.1, width: 0.3, height: 0.4 } // Normalized (0-1)
      };
      
      const result = detectorWithEmbedding.embed({ 
        source: img, 
        detection: detection as any 
      });
      
      expect(result).toBeDefined();
    });

    it('should handle pixel-based bounding boxes', async () => {
      const img = createMockHTMLImageElement();
      img.naturalWidth = 640;
      img.naturalHeight = 480;
      
      const detection = { 
        boundingBox: { originX: 64, originY: 48, width: 192, height: 192 } // Pixel values
      };
      
      const result = detectorWithEmbedding.embed({ 
        source: img, 
        detection: detection as any 
      });
      
      expect(result).toBeDefined();
    });

    it('should clamp bounding boxes to valid ranges', async () => {
      const img = createMockHTMLImageElement();
      img.naturalWidth = 640;
      img.naturalHeight = 480;
      
      const detection = { 
        boundingBox: { originX: -0.1, originY: 1.1, width: 1.5, height: 0.5 } // Out of bounds
      };
      
      // Should not throw error, should clamp values
      const result = detectorWithEmbedding.embed({ 
        source: img, 
        detection: detection as any 
      });
      
      expect(result).toBeDefined();
    });

    it('should throw error for invalid bounding box dimensions', async () => {
      const img = createMockHTMLImageElement();
      img.naturalWidth = 640;
      img.naturalHeight = 480;
      
      const detection = { 
        boundingBox: { originX: 0.5, originY: 0.5, width: 0, height: 0 } // Zero dimensions
      };
      
      expect(() => detectorWithEmbedding.embed({ 
        source: img, 
        detection: detection as any 
      })).toThrow('Invalid bounding box dimensions');
    });
  });
}); 
