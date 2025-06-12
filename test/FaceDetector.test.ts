import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaceDetector } from '../src/FaceDetector';
import type { FaceDetectionOptions } from '../src/types';

// Mock MediaPipe modules
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  FaceDetector: {
    createFromOptions: vi.fn().mockResolvedValue({
      detect: vi.fn().mockResolvedValue({ detections: [] }),
      detectForVideo: vi.fn().mockResolvedValue({ detections: [] }),
    }),
  },
  ImageEmbedder: {
    createFromOptions: vi.fn().mockResolvedValue({
      embed: vi.fn().mockResolvedValue({ embeddings: [new Float32Array(128)] }),
      embedForVideo: vi.fn().mockResolvedValue({ embeddings: [new Float32Array(128)] }),
    }),
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

    it('should not reinitialize if already initialized', async () => {
      await detector.initialize();
      const firstState = detector.state;
      await detector.initialize();
      expect(detector.state).toBe(firstState);
    });
  });

  describe('detectFromImage', () => {
    it('should throw error if not initialized', async () => {
      const img = new Image();
      await expect(detector.detectFromImage(img)).rejects.toThrow('Face detector not initialized');
    });

    it('should detect faces from image when initialized', async () => {
      await detector.initialize();
      const img = new Image();
      const detections = await detector.detectFromImage(img);
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('detectFromVideo', () => {
    it('should throw error if not initialized', async () => {
      const video = document.createElement('video');
      await expect(detector.detectFromVideo(video, 0)).rejects.toThrow('Face detector not initialized');
    });

    it('should detect faces from video when initialized', async () => {
      const videoDetector = new FaceDetector({
        ...defaultOptions,
        mode: 'VIDEO',
      });
      await videoDetector.initialize();
      const video = document.createElement('video');
      const detections = await videoDetector.detectFromVideo(video, 0);
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('embed', () => {
    it('should throw error if embedder not initialized', async () => {
      await detector.initialize();
      const img = new Image();
      const detection = { boundingBox: { originX: 0, originY: 0, width: 100, height: 100 } };
      await expect(detector.embed({ source: img, detection: detection as any }))
        .rejects.toThrow('Face embedder not initialized');
    });
  });
}); 