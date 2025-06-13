import { useMemo } from 'react';
import { FaceDetector } from '../../FaceDetector';
import { FaceSimilarityResult, EmbeddingResult } from "../../types";

export type FaceSimilarity = FaceSimilarityResult & {
  isMatch: boolean;
  message: string;
};

/**
 * Calculates the cosine similarity between two face embeddings.
 * @param uploadEmbedding - The embedding of the uploaded face.
 * @param webcamEmbedding - The embedding of the webcam face.
 * @param threshold - The threshold for the similarity score.
 * @returns The similarity score and a boolean indicating if the faces are a match (similarity > threshold). if no embeddings are provided, returns null.
 */
export const useFaceSimilarity = (
  a: EmbeddingResult | null,
  b: EmbeddingResult | null,
  threshold: number = 0.5
): FaceSimilarity | null => {
  const similarity = useMemo(() => {
    const embeddingA = a?.embeddings?.[0];
    const embeddingB = b?.embeddings?.[0];
    if (!embeddingA || !embeddingB) return null;
    const similarity = FaceDetector.cosineSimilarity(embeddingA, embeddingB);
    return {
      similarity,
      message: `Face Similarity: ${similarity.toFixed(3)}`,
      isMatch: similarity > threshold,
    };
  }, [a, b, threshold]);

  return similarity;
};
