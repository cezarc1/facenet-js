import {
  Detection,
  FaceDetector as FaceDetectorMediaPipe,
  FilesetResolver,
  ImageEmbedder,
} from '@mediapipe/tasks-vision';
import {
  EmbeddingRequest,
  EmbeddingResult,
  FaceDetection,
  FaceDetectionOptions,
  FaceDetectorState,
} from './types';

const DEFAULT_DETECTION_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const DEFAULT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

export class FaceDetector {
  private faceDetector: FaceDetectorMediaPipe | null = null;
  private faceEmbedder: ImageEmbedder | null = null;
  private options: FaceDetectionOptions;
  private _state: FaceDetectorState = 'not_initialized';
  private _error: Error | null = null;

  get state() {
    return this._state;
  }

  get error() {
    return this._error;
  }

  /**
   * Creates a new face detector.
   * @param options - The options for the face detector.
   */
  constructor(options: FaceDetectionOptions) {
    this.options = options;
  }

  async initialize() {
    if (this.state === 'initialized') {
      return;
    }
    if (this.state === 'initializing') {
      return;
    }

    try {
      this._state = 'initializing';
      this._error = null;
      const vision = await FilesetResolver.forVisionTasks(
        this.options.wasmPath || DEFAULT_WASM_PATH
      );
      this.faceDetector = await FaceDetectorMediaPipe.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: this.options.detectionModelPath || DEFAULT_DETECTION_MODEL,
          delegate: this.options.device,
        },
        runningMode: this.options.mode,
        minDetectionConfidence: this.options.minDetectionConfidence,
      });

      // Create face embedder only if embedding model path is provided
      if (this.options.embeddingModelPath) {
        this.faceEmbedder = await ImageEmbedder.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.options.embeddingModelPath,
            delegate: this.options.device,
          },
          runningMode: this.options.mode,
        });
      }

      this._state = 'initialized';
    } catch (error) {
      this._state = 'error';
      this._error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  /**
   * Detects faces from an image element.
   * @param imageElement - The image element to detect faces from.
   * @returns The detections.
   */
  async detectFromImage(imageElement: HTMLImageElement): Promise<FaceDetection[]> {
    if (this.state !== 'initialized') {
      throw new Error('Face detector not initialized');
    }
    return this.faceDetector?.detect(imageElement).detections ?? [];
  }

  /**
   * Detects faces from a video element.
   * @param videoElement - The video element to detect faces from.
   * @param timestamp - The timestamp of the video element.
   * @returns The detections.
   */
  async detectFromVideo(
    videoElement: HTMLVideoElement,
    timestamp: number
  ): Promise<FaceDetection[]> {
    if (this.state !== 'initialized') {
      throw new Error('Face detector not initialized');
    }
    const detections = this.faceDetector?.detectForVideo(videoElement, timestamp);
    return detections?.detections ?? [];
  }

  /**
   * Validates and normalizes a bounding box.
   * @param bbox - The bounding box to validate and normalize.
   * @param mediaWidth - The width of the media.
   * @param mediaHeight - The height of the media.
   * @returns The normalized bounding box.
   */
  private validateAndNormalizeRegion(
    bbox: NonNullable<Detection['boundingBox']>,
    mediaWidth: number,
    mediaHeight: number
  ) {
    const isNormalized =
      bbox.originX <= 1 && bbox.originY <= 1 && bbox.width <= 1 && bbox.height <= 1;
    let left, top, right, bottom;
    if (isNormalized) {
      left = bbox.originX;
      top = bbox.originY;
      right = bbox.originX + bbox.width;
      bottom = bbox.originY + bbox.height;
    } else {
      left = bbox.originX / mediaWidth;
      top = bbox.originY / mediaHeight;
      right = (bbox.originX + bbox.width) / mediaWidth;
      bottom = (bbox.originY + bbox.height) / mediaHeight;
    }
    left = Math.max(0, Math.min(1, left));
    top = Math.max(0, Math.min(1, top));
    right = Math.max(0, Math.min(1, right));
    bottom = Math.max(0, Math.min(1, bottom));
    if (right <= left || bottom <= top) {
      throw new Error('Invalid bounding box dimensions');
    }
    return { left, top, right, bottom };
  }

  /**
   * Embeds a face into a vector.
   * @param request - The request for embedding a face.
   * @returns The embedded face vector.
   * @throws Error if face embedder is not initialized (embeddingModelPath not provided)
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResult | null> {
    if (this.state !== 'initialized') {
      throw new Error('Face detector not initialized');
    }

    if (!this.faceEmbedder) {
      throw new Error(
        'Face embedder not initialized. Please provide embeddingModelPath in options.'
      );
    }

    const { source, detection, timestamp } = request;
    const bbox = detection.boundingBox;
    if (!bbox) {
      console.warn('No bounding box found for embedding');
      return null;
    }
    let mediaWidth: number, mediaHeight: number;
    if (source instanceof HTMLImageElement) {
      mediaWidth = source.naturalWidth;
      mediaHeight = source.naturalHeight;
      if (this.options.mode !== 'IMAGE') {
        throw new Error('Cannot embed image in video mode');
      }
      const regionOfInterest = this.validateAndNormalizeRegion(bbox, mediaWidth, mediaHeight);
      return this.faceEmbedder.embed(source, {
        regionOfInterest,
        rotationDegrees: bbox.angle,
      });
    } else if (source instanceof HTMLVideoElement) {
      mediaWidth = source.videoWidth;
      mediaHeight = source.videoHeight;
      if (this.options.mode !== 'VIDEO') {
        throw new Error('Cannot embed video in image mode');
      }
      const regionOfInterest = this.validateAndNormalizeRegion(bbox, mediaWidth, mediaHeight);
      return this.faceEmbedder.embedForVideo(source, timestamp ?? performance.now(), {
        regionOfInterest,
        rotationDegrees: bbox.angle,
      });
    }

    throw new Error('Invalid source type');
  }
}
