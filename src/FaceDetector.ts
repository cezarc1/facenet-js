import {
  Detection,
  FaceDetector as FaceDetectorMediaPipe,
  FilesetResolver,
  ImageEmbedder,
} from '@mediapipe/tasks-vision';
import {
  Embedding,
  EmbeddingRequest,
  EmbeddingResult,
  FaceDetection,
  FaceDetectionOptions,
  FaceDetectorState
} from './types';

const DEFAULT_DETECTION_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const DEFAULT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

/**
 * A class for detecting and embedding faces.
 * 
 * @example
 * ```ts
 * const faceDetector = new FaceDetector({
 *   device: 'GPU',
 *   mode: 'IMAGE',
 *   minDetectionConfidence: 0.5,
 * });
 * await faceDetector.initialize();
 * const detections = faceDetector.detectFromImage(imageElement);
 * const embeddings = faceDetector.embed({
 *   source: imageElement,
 *   detection: detections[0],
 * });
 * const similarity = FaceDetector.cosineSimilarity(embeddings[0], embeddings[1]);
 * if (similarity > 0.5) {
 *   console.log('The faces are similar');
 * } else {
 *   console.log('The faces are different');
 * }
 * ```
 */
export class FaceDetector {
  private faceDetector: FaceDetectorMediaPipe | null = null;
  private faceEmbedder: ImageEmbedder | null = null;
  private options: FaceDetectionOptions;
  private _state: FaceDetectorState = 'not_initialized';
  private _error: Error | null = null;

  constructor(options: FaceDetectionOptions) {
    this.options = options;
  }

  get state() {
    return this._state;
  }

  get error() {
    return this._error;
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

      if (this.options.embeddingModelPath) {
        // create face detector and face embedder in parallel
        const [faceDetector, faceEmbedder] = await Promise.all([
          FaceDetectorMediaPipe.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: this.options.detectionModelPath || DEFAULT_DETECTION_MODEL,
              delegate: this.options.device,
            },
            runningMode: this.options.mode,
            minDetectionConfidence: this.options.minDetectionConfidence,
          }),
          ImageEmbedder.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: this.options.embeddingModelPath,
              delegate: this.options.device,
            },
            runningMode: this.options.mode,
          })
        ]);

        this.faceDetector = faceDetector;
        this.faceEmbedder = faceEmbedder;
      } else {
        // Create face detector but not face embedder if no embedding model path
        this.faceDetector = await FaceDetectorMediaPipe.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.options.detectionModelPath || DEFAULT_DETECTION_MODEL,
            delegate: this.options.device,
          },
          runningMode: this.options.mode,
          minDetectionConfidence: this.options.minDetectionConfidence,
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
   * 
   * @example
   * ```ts
   * const detections = faceDetector.detectFromImage(imageElement);
   * if (detections.length > 0) {
   *   console.log('The image contains ' + detections.length + ' faces');
   * } else {
   *   console.log('The image does not contain any faces');
   * }
   * ```
   * @param imageElement - The image element to detect faces from.
   * @returns The detections. If no faces are detected, returns an empty array.
   */
  detectFromImage(imageElement: HTMLImageElement): FaceDetection[] {
    if (this.state !== 'initialized') {
      throw new Error('Face detector not initialized');
    }
    return this.faceDetector?.detect(imageElement).detections ?? [];
  }

  /**
   * Detects faces from a video element.
   * 
   * @example
   * ```ts
   * const detections = faceDetector.detectFromVideo(videoElement, timestamp);
   * if (detections.length > 0) {
   *   console.log('The video contains ' + detections.length + ' faces at timestamp ' + timestamp);
   * } else {
   *   console.log('The video does not contain any faces');
   * }
   * ```
   * @param videoElement - The video element to detect faces from.
   * @param timestamp - The timestamp of the video element.
   * @returns The detections.
   */
  detectFromVideo(
    videoElement: HTMLVideoElement,
    timestamp: number
  ): FaceDetection[] {
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
   * Embeds a detected face into a tensor.
   * The resulting tensor can be then compared to other embeddings using cosine similarity or other distance metrics.
   * 
   * @example
   * ```ts
   * const result = imageFaceDetector.embed({
   *   source: imageElement,
   *   detection: faceDetectedFromImageElement,
   * });
   * 
   * const result2 = videoFaceDetector.embed({
   *   source: videoElement,
   *   detection: faceDetectedFromVideoElement,
   *   timestamp: performance.now()
   * });
   *
   * const similarity = FaceDetector.cosineSimilarity(result.embeddings[0], result2.embeddings[0]);
   * if (similarity > 0.5) {
   *   console.log('The faces are similar');
   * } else {
   *   console.log('The faces are different');
   * }
   * ```
   * @param request - The request for embedding a face.
   * @returns The embedded face tensor or null if no bounding box is found.
   * @throws Error if face embedder is not initialized (embeddingModelPath not provided)
   */
  embed(request: EmbeddingRequest): EmbeddingResult | null {
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

  /**
   * Computes the cosine similarity between two embeddings.
   * The cosine similarity score is between -1 and 1, where 1 means the embeddings are identical, and -1 means they are completely different.
   * 
   * @example
   * ```ts
   * const similarity = FaceDetector.cosineSimilarity(faceEmbedding1, faceEmbedding2);
   * if (similarity > 0.5) {
   *   console.log('The embeddings are similar');
   * } else {
   *   console.log('The embeddings are different');
   * }
   * ```
   * @param a - The first embedding.
   * @param b - The second embedding.
   * @returns The cosine similarity score.
   */
  static cosineSimilarity(a: Embedding, b: Embedding): number {
    return ImageEmbedder.cosineSimilarity(a, b);
  }
}
