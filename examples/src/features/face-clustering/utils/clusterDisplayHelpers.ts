import type { FaceSource } from 'facenet-js/react';

export type PhotoItem = {
  photo: FaceSource;
};

export const getClusterLabel = (clusterIndex: number) =>
  `Person ${String.fromCharCode(65 + clusterIndex)}`;

export const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) {
    return 'text-[var(--demo-success)]';
  }

  if (confidence >= 0.6) {
    return 'text-[var(--demo-warning)]';
  }

  return 'text-[var(--demo-danger)]';
};

export const getPhotoGridClass = (photoCount: number) => {
  if (photoCount === 1) {
    return 'grid-cols-1';
  }

  if (photoCount === 2) {
    return 'grid-cols-2';
  }

  return 'grid-cols-3';
};

export const getUniquePhotos = <T extends PhotoItem>(items: T[]) => {
  return items.reduce<T[]>((uniqueItems, item) => {
    if (!uniqueItems.some(existingItem => existingItem.photo.id === item.photo.id)) {
      uniqueItems.push(item);
    }

    return uniqueItems;
  }, []);
};

export const getPhotoFaceCounts = <T extends PhotoItem>(items: T[]) => {
  return items.reduce<Map<string | undefined, number>>((counts, item) => {
    counts.set(item.photo.id, (counts.get(item.photo.id) ?? 0) + 1);
    return counts;
  }, new Map());
};
