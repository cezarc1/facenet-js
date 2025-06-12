import { useMemo } from 'react';
import { FaceDetector } from '../../FaceDetector';
import { FaceSimilarityResult } from "../../types";

export type FaceSimilarity = FaceSimilarityResult & {
  isMatch: boolean;
  message: string;
};

/**
 * Calculates the similarity between two face embeddings.
 * @param uploadEmbedding - The embedding of the uploaded face.
 * @param webcamEmbedding - The embedding of the webcam face.
 * @param threshold - The threshold for the similarity score.
 * @returns The similarity score and a boolean indicating if the faces are a match. if no embeddings are provided, returns null.
 */
export const useFaceSimilarity = (
  a: Embedding | null,
  b: Embedding | null,
  threshold: number = 0.5
): FaceSimilarity | null => {
  const similarity = useMemo(() => {
    if (!a || !b) return null;
    const similarity = FaceDetector.cosineSimilarity(a, b);
    return {
      similarity,
      message: `Face Similarity: ${similarity.toFixed(3)}`,
      isMatch: similarity > threshold,
    };
  }, [a, b, threshold]);

  return similarity;
};
