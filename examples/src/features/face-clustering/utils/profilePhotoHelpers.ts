import {
  DEFAULT_OPTIONS,
  type ClusterResult,
  type ClusteringOptions,
  type Detection,
  type EmbeddingResult,
  type FaceCluster,
} from 'facenet-js';
import type { FaceSource } from 'facenet-js/react';

export const MAX_PROFILE_PHOTOS = 20;
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
const VALID_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface ImageValidationResult {
  validFiles: File[];
  errors: string[];
}

export interface ProfileSimilarityResult {
  similarity: number;
  isMatch: boolean;
  message: string;
}

export interface ProfileClusterCounts {
  clusters: number;
  outliers: number;
  totalFaces: number;
  clusteredFaces: number;
  hasClusterResult: boolean;
  hasSelectableClusters: boolean;
}

export interface FaceCropRect {
  sx: number;
  sy: number;
  size: number;
}

type FaceBoundingBox = NonNullable<Detection['boundingBox']>;

export const getProfileClusteringDefaults = (): Required<ClusteringOptions> => ({
  ...DEFAULT_OPTIONS,
  algorithm: 'KMEANS',
  maxClusters: 1,
});

export const validateImageFiles = (
  files: Iterable<File>,
  remainingSlots: number
): ImageValidationResult => {
  const errors: string[] = [];
  const validFiles = Array.from(files).filter(file => {
    if (!VALID_IMAGE_TYPES.has(file.type)) {
      errors.push(`Invalid file type: ${file.name}. Only JPG, PNG, and WebP are supported.`);
      return false;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      errors.push(`File too large: ${file.name}. Maximum size is 10MB.`);
      return false;
    }

    return true;
  });

  if (validFiles.length > remainingSlots) {
    return {
      validFiles: [],
      errors: [`Too many photos. Maximum ${MAX_PROFILE_PHOTOS} photos allowed.`],
    };
  }

  return { validFiles, errors };
};

export const createFaceSourceFromDataUrl = (imageData: string, id: string): Promise<FaceSource> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error('Invalid image dimensions'));
        return;
      }

      resolve({ image, id });
    };
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageData;
  });
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getFaceCropRect = (
  boundingBox: Pick<FaceBoundingBox, 'originX' | 'originY' | 'width' | 'height'>,
  imageWidth: number,
  imageHeight: number,
  paddingRatio = 0.45
): FaceCropRect => {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error('Invalid image dimensions');
  }

  if (boundingBox.width <= 0 || boundingBox.height <= 0) {
    throw new Error('Invalid face bounding box');
  }

  const faceCenterX = boundingBox.originX + boundingBox.width / 2;
  const faceCenterY = boundingBox.originY + boundingBox.height / 2;
  const requestedSize = Math.max(boundingBox.width, boundingBox.height) * (1 + paddingRatio * 2);
  const size = Math.round(Math.min(requestedSize, imageWidth, imageHeight));
  const sx = Math.round(clamp(faceCenterX - size / 2, 0, imageWidth - size));
  const sy = Math.round(clamp(faceCenterY - size / 2, 0, imageHeight - size));

  return { sx, sy, size };
};

export const cropImageToFaceDataUrl = (image: HTMLImageElement, detection: Detection): string => {
  const boundingBox = detection.boundingBox;
  if (!boundingBox) {
    throw new Error('No face bounding box found');
  }

  const cropRect = getFaceCropRect(boundingBox, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = cropRect.size;
  canvas.height = cropRect.size;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  context.drawImage(
    image,
    cropRect.sx,
    cropRect.sy,
    cropRect.size,
    cropRect.size,
    0,
    0,
    cropRect.size,
    cropRect.size
  );

  return canvas.toDataURL('image/jpeg', 0.95);
};

export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
};

export const getPhotoListKey = (photos: FaceSource[]) =>
  photos.map(photo => photo.id ?? '').join('|');

export const getProfileClusterCounts = (
  clusters: ClusterResult | null | undefined
): ProfileClusterCounts => {
  const clusterCount = clusters?.clusters.length ?? 0;
  const outlierCount = clusters?.outliers.length ?? 0;
  const clusteredFaces = clusters?.clusters.reduce((sum, cluster) => sum + cluster.size, 0) ?? 0;
  const totalFaces = clusters?.totalEmbeddings ?? 0;

  return {
    clusters: clusterCount,
    outliers: outlierCount,
    totalFaces,
    clusteredFaces,
    hasClusterResult: totalFaces > 0,
    hasSelectableClusters: clusterCount > 0,
  };
};

const cosineSimilarity = (a: number[], b: number[]) => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return null;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index++) {
    const valueA = a[index] ?? 0;
    const valueB = b[index] ?? 0;
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return null;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

export const calculateProfileSimilarity = (
  cluster: FaceCluster | null,
  webcamEmbedding: EmbeddingResult | null,
  threshold = 0.5
): ProfileSimilarityResult | null => {
  const profileVector = cluster?.centroid.floatEmbedding;
  const webcamVector = webcamEmbedding?.embeddings[0]?.floatEmbedding;

  if (!profileVector || !webcamVector) {
    return null;
  }

  const similarity = cosineSimilarity(profileVector, webcamVector);
  if (similarity === null) {
    return null;
  }

  return {
    similarity,
    isMatch: similarity > threshold,
    message: `Profile Similarity: ${similarity.toFixed(3)}`,
  };
};
