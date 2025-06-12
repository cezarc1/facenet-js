import { Detection, FilesetResolver, ImageEmbedderResult } from '@mediapipe/tasks-vision';
export type { Detection, ImageEmbedderResult } from '@mediapipe/tasks-vision';

export type FaceDetectionDevice = 'CPU' | 'GPU';
export type FaceDetectionMode = 'IMAGE' | 'VIDEO';

export type FaceDetectorState = 'not_initialized' | 'initializing' | 'initialized' | 'error';

/**
 * Request for embedding a face.
 */
export type EmbeddingRequest = {
  source: HTMLImageElement | HTMLVideoElement;
  detection: Detection;
  timestamp?: number;
};

export interface FaceDetectionOptions {
  /** Computation device to use */
  device: FaceDetectionDevice;
  /** Detection mode for images or video */
  mode: FaceDetectionMode;
  /** Minimum confidence threshold for face detection (0-1) */
  minDetectionConfidence: number;
  /** Optional custom path to the face detection model. Defaults to MediaPipe's hosted model */
  detectionModelPath?: string;
  /** Path to the FaceNet embedding model. Required for face embedding features */
  embeddingModelPath?: string;
  /** Optional custom WASM files path. Defaults to MediaPipe's CDN */
  wasmPath?: string;
}

export interface FaceSimilarityResult {
  // The cosine similarity score between the two embeddings.
  // They are between -1 and 1, where 1 means the embeddings are identical, and -1 means they are completely different.
  similarity: number;
}

/**
 * MediaPipe Wasm fileset type.  WasmFile set is not exported from MediaPipe, so we need to use this magical incantation.
 */
export type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

export type FaceDetection = Detection;

export type EmbeddingResult = ImageEmbedderResult;
