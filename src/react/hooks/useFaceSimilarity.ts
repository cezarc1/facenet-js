import { useMemo } from 'react';
import { Embedding, ImageEmbedder } from '@mediapipe/tasks-vision';

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
) => {
  const similarity = useMemo(() => {
    if (!a || !b) return null;
    const score = ImageEmbedder.cosineSimilarity(a, b);
    return {
      score,
      message: `Face Similarity: ${score.toFixed(3)}`,
      isMatch: score > threshold,
    };
  }, [a, b, threshold]);

  return similarity;
};
