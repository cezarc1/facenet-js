import { useCallback, useEffect, useState } from 'react';
import { useFaceDetector } from './useFaceDetection';
import { Detection, EmbeddingResult } from '../../types';

export interface FaceSource {
  /** The image element containing faces */
  image: HTMLImageElement;
  /** Pre-detected faces in the image (optional - will auto-detect if not provided) */
  detections?: Detection[];
  /** Unique identifier for this source */
  id?: string;
}

export interface EmbeddingWithSource {
  /** The face embedding */
  embedding: EmbeddingResult;
  /** Index of the source image this embedding came from */
  sourceIndex: number;
  /** Index of the detection within the source image */
  detectionIndex: number;
  /** Unique identifier for the source */
  sourceId?: string;
}

/**
 * React hook for generating embeddings from multiple face sources.
 * Automatically detects faces and generates embeddings for each detected face.
 *
 * @param sources - Array of image sources to process
 * @returns Object containing embeddings, loading state, and any errors
 *
 * @example
 * ```tsx
 * const sources = [
 *   { image: img1, id: 'photo1' },
 *   { image: img2, id: 'photo2' }
 * ];
 *
 * const { embeddings, embeddingsWithSource, isLoading, error } = useMultiFaceEmbeddings(sources);
 *
 * if (embeddings.length > 0) {
 *   console.log(`Generated ${embeddings.length} face embeddings`);
 * }
 * ```
 */
export const useMultiFaceEmbeddings = (
  sources: FaceSource[]
): {
  /** Array of face embeddings extracted from all sources */
  embeddings: EmbeddingResult[];
  /** Array of embeddings with source metadata */
  embeddingsWithSource: EmbeddingWithSource[];
  /** Whether embedding generation is in progress */
  isLoading: boolean;
  /** Error that occurred during processing, if any */
  error: Error | null;
  /** Progress information */
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
} => {
  const { faceDetector, isLoading: detectorLoading, error: detectorError } = useFaceDetector();
  const [embeddings, setEmbeddings] = useState<EmbeddingResult[]>([]);
  const [embeddingsWithSource, setEmbeddingsWithSource] = useState<EmbeddingWithSource[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });

  const processEmbeddings = useCallback(async () => {
    if (!faceDetector || detectorLoading || !sources.length) {
      setEmbeddings([]);
      setEmbeddingsWithSource([]);
      setProgress({ current: 0, total: 0, percentage: 0 });
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setProgress({ current: 0, total: sources.length, percentage: 0 });

    try {
      const allEmbeddings: EmbeddingResult[] = [];
      const allEmbeddingsWithSource: EmbeddingWithSource[] = [];

      for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
        const source = sources[sourceIndex];
        if (!source) continue;

        // Update progress
        setProgress({
          current: sourceIndex,
          total: sources.length,
          percentage: Math.round((sourceIndex / sources.length) * 100),
        });

        try {
          // Detect faces if not provided
          const detections = source.detections || faceDetector.detectFromImage(source.image);

          // Generate embeddings for each detected face
          for (let detectionIndex = 0; detectionIndex < detections.length; detectionIndex++) {
            const detection = detections[detectionIndex];
            if (!detection) continue;

            try {
              const embedding = faceDetector.embed({
                source: source.image,
                detection,
              });

              if (embedding) {
                allEmbeddings.push(embedding);
                allEmbeddingsWithSource.push({
                  embedding,
                  sourceIndex,
                  detectionIndex,
                  sourceId: source.id,
                });
              }
            } catch (embeddingError) {
              console.warn(
                `Failed to generate embedding for detection ${detectionIndex} in source ${sourceIndex}:`,
                embeddingError
              );
            }
          }
        } catch (detectionError) {
          console.warn(`Failed to process source ${sourceIndex}:`, detectionError);
        }
      }

      setEmbeddings(allEmbeddings);
      setEmbeddingsWithSource(allEmbeddingsWithSource);
      setProgress({
        current: sources.length,
        total: sources.length,
        percentage: 100,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setProcessingError(error);
      setEmbeddings([]);
      setEmbeddingsWithSource([]);
    } finally {
      setIsProcessing(false);
    }
  }, [faceDetector, detectorLoading, sources]);

  useEffect(() => {
    processEmbeddings();
  }, [processEmbeddings]);

  return {
    embeddings,
    embeddingsWithSource,
    isLoading: detectorLoading || isProcessing,
    error: detectorError || processingError,
    progress,
  };
};
