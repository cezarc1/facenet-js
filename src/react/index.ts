export { useFaceDetector } from './hooks/useFaceDetection';
export { useFaceSimilarity } from './hooks/useFaceSimilarity';
export { useWebcam } from './hooks/useWebcam';
export { useFaceClustering } from './hooks/useFaceClustering';
export { useMultiFaceEmbeddings } from './hooks/useMultiFaceEmbeddings';

export type { FaceSource, EmbeddingWithSource } from './hooks/useMultiFaceEmbeddings';

export {
  FaceDetectorProvider,
  ImageFaceDetectorProvider,
  VideoFaceDetectorProvider,
} from './providers/FaceDetectorProvider';
