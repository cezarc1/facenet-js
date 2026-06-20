import { DBSCAN, KMEANS, OPTICS } from 'density-clustering';
import { agnes } from 'ml-hclust';
import { Embedding, EmbeddingResult } from './types';

export type ClusteringAlgorithm = 'DBSCAN' | 'HIERARCHICAL' | 'KMEANS' | 'OPTICS';


export interface ClusteringOptions {
  /** The clustering algorithm to use.
   * Default: 'DBSCAN'
   */
  algorithm?: ClusteringAlgorithm;

  /** Similarity threshold (0-1). Higher values require more similarity to cluster together.
   * Default: 0.6
   */
  threshold?: number;

  /** Minimum number of points required to form a cluster (DBSCAN/OPTICS).
   * Default: 2
   */
  minSamples?: number;

  /** Maximum number of clusters to create (KMEANS).
   * Default: 100
   */
  maxClusters?: number;

  /** Distance metric to use.
   * Default: 'cosine'
   */
  distanceMetric?: 'cosine' | 'euclidean';
}

export interface FaceCluster {
  /** Unique identifier for this cluster */
  id: string;
  /** Indices of embeddings that belong to this cluster */
  memberIndices: number[];
  /** Representative embedding for this cluster (centroid) */
  centroid: Embedding;
  /** Confidence score indicating cluster cohesion (0-1) */
  confidence: number;
  /** Number of faces in this cluster */
  size: number;
}

export interface ClusterResult {
  /** Array of discovered face clusters */
  clusters: FaceCluster[];
  /** Indices of embeddings that couldn't be clustered (outliers) */
  outliers: number[];
  /** Algorithm used for clustering */
  algorithm: ClusteringAlgorithm;
  /** Total number of embeddings processed */
  totalEmbeddings: number;
  /** Options used for clustering */
  options: ClusteringOptions;
}

export const DEFAULT_OPTIONS: Required<ClusteringOptions> = {
  algorithm: 'DBSCAN',
  threshold: 0.6,
  minSamples: 2,
  maxClusters: 100,
  distanceMetric: 'cosine',
};

/**
 * A class for clustering face embeddings to group similar faces together.
 * This clustering happens on the CPU.
 *
 * @example
 * ```ts
 * const clusterer = new FaceClusterer({
 *   algorithm: 'DBSCAN',
 *   threshold: 0.7,
 *   minSamples: 2
 * });
 *
 * const result = clusterer.cluster(embeddings);
 * console.log(`Found ${result.clusters.length} face clusters`);
 *
 * // Or use static method
 * const result = FaceClusterer.cluster(embeddings, { algorithm: 'DBSCAN' });
 * ```
 */
export class FaceClusterer {
  private options: Required<ClusteringOptions>;
  private readonly dbscan?: DBSCAN;
  private readonly optics?: OPTICS;
  private readonly kmeans?: KMEANS;

  constructor(options?: ClusteringOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<ClusteringOptions>;
    if (this.options.algorithm === 'DBSCAN') {
      this.dbscan = new DBSCAN();
    } else if (this.options.algorithm === 'OPTICS') {
      this.optics = new OPTICS();
    } else if (this.options.algorithm === 'KMEANS') {
      this.kmeans = new KMEANS();
    }
  }

  /**
   * Clusters an array of face embeddings using the configured algorithm.
   *
   * @param embeddings - Array of face embedding results to cluster
   * @returns Clustering result with both clusters and outliers
   */
  cluster(embeddings: EmbeddingResult[]): ClusterResult {
    if (!embeddings || embeddings.length === 0) {
      throw new Error('No embeddings provided for clustering');
    }
    const embeddingVectors = this.extractEmbeddingVectors(embeddings);
    if (embeddingVectors.length === 0) {
      throw new Error('No valid embedding vectors found');
    }
    let clusterLabels: number[];
    switch (this.options.algorithm) {
      case 'DBSCAN':
        clusterLabels = FaceClusterer.clusterDBSCAN(this.dbscan!, embeddingVectors, /*epsilon=*/1 - this.options.threshold, /*minSamples=*/this.options.minSamples);
        break;
      case 'OPTICS':
        clusterLabels = FaceClusterer.clusterOPTICS(this.optics!, embeddingVectors, /*epsilon=*/1 - this.options.threshold, /*minSamples=*/this.options.minSamples);
        break;
      case 'KMEANS':
        clusterLabels = FaceClusterer.clusterKMEANS(this.kmeans!, embeddingVectors, /*maxClusters=*/this.options.maxClusters);
        break;
      case 'HIERARCHICAL':
        clusterLabels = FaceClusterer.clusterHierarchical(embeddingVectors, /*threshold=*/this.options.threshold, /*distanceMetric=*/this.options.distanceMetric);
        break;
      default:
        throw new Error(`Unsupported clustering algorithm: ${this.options.algorithm}`);
    }
    return this.buildClusterResult(embeddingVectors, clusterLabels, embeddings);
  }

  private extractEmbeddingVectors(embeddings: EmbeddingResult[]): Float32Array[] {
    const vectors: Float32Array[] = [];
    for (const embeddingResult of embeddings) {
      if (embeddingResult.embeddings && embeddingResult.embeddings.length > 0) {
        const embedding = embeddingResult.embeddings[0];
        const floatEmbedding = embedding?.floatEmbedding;
        if (
          floatEmbedding &&
          floatEmbedding.length > 0 &&
          floatEmbedding.every(Number.isFinite)
        ) {
          vectors.push(new Float32Array(floatEmbedding));
        }
      }
    }
    return vectors;
  }

  /** https://en.wikipedia.org/wiki/DBSCAN */
  static clusterDBSCAN(dbscan: DBSCAN, embeddingVectors: Float32Array[], epsilon: number, minSamples: number): number[] {
    const dataset = embeddingVectors.map(vector => Array.from(vector));
    const clusters = dbscan.run(dataset, epsilon, minSamples);
    return FaceClusterer.clustersToLabels(clusters, dataset.length);
  }

  /** https://en.wikipedia.org/wiki/OPTICS_algorithm */
  static clusterOPTICS(optics: OPTICS, embeddingVectors: Float32Array[], epsilon: number, minSamples: number): number[] {
    const dataset = embeddingVectors.map(vector => Array.from(vector));
    const clusters = optics.run(dataset, epsilon, minSamples);
    return FaceClusterer.clustersToLabels(clusters, dataset.length);
  }

  /** https://en.wikipedia.org/wiki/K-means_clustering */
  static clusterKMEANS(kmeans: KMEANS, embeddingVectors: Float32Array[], maxClusters: number): number[] {
    const dataset = embeddingVectors.map(vector => Array.from(vector));
    const k = Math.min(maxClusters, Math.ceil(Math.sqrt(dataset.length / 2)));
    const clusters = kmeans.run(dataset, k);
    return FaceClusterer.clustersToLabels(clusters, dataset.length);
  }

  /** https://en.wikipedia.org/wiki/Hierarchical_clustering */
  static clusterHierarchical(embeddingVectors: Float32Array[], threshold: number, distanceMetric: 'cosine' | 'euclidean'): number[] {
    const dataset = embeddingVectors.map(vector => Array.from(vector));
    const distanceMatrix = FaceClusterer.createDistanceMatrix(dataset, distanceMetric);
    const tree = agnes(distanceMatrix, {
      method: 'ward',
      isDistanceMatrix: true,
    });
    const clusters = tree.cut(1 - threshold);
    const labels = new Array(dataset.length).fill(-1);
    if (Array.isArray(clusters)) {
      clusters.forEach((clusterLabel, index) => {
        labels[index] = clusterLabel;
      });
    }
    return labels;
  }

  private static createDistanceMatrix(dataset: number[][], distanceMetric: 'cosine' | 'euclidean'): number[][] {
    const matrix: number[][] = Array(dataset.length)
      .fill(null)
      .map(() => Array(dataset.length).fill(0));
    const distanceFunction = distanceMetric === 'cosine' ? FaceClusterer.cosineDistance : FaceClusterer.euclideanDistance;
    const maxDistance = distanceMetric === 'cosine' ? 1 : Number.MAX_VALUE;
    for (let i = 0; i < dataset.length; i++) {
      for (let j = i + 1; j < dataset.length; j++) {
        const vec1 = dataset[i];
        const vec2 = dataset[j];
        let dist: number;
        if (vec1 && vec2) {
          dist = distanceFunction(vec1, vec2);
          // Handle NaN cases (e.g., zero vectors in cosine distance)
          if (isNaN(dist) || !isFinite(dist)) {
            dist = maxDistance;
          }
        } else {
          dist = maxDistance;
        }
        matrix[i]![j] = dist;
        matrix[j]![i] = dist;
      }
    }

    return matrix;
  }

  /** https://en.wikipedia.org/wiki/Cosine_similarity.
   *  Note that the distance is 1 - cosine similarity.
   */
  private static cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
        normA += aVal * aVal;
        normB += bVal * bVal;
      }
    }
    // Avoid division by zero
    if (normA === 0 || normB === 0) {
      return 1;
    }
    return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
  }

  private static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    let sumSquaredDiffs = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        sumSquaredDiffs += Math.pow(aVal - bVal, 2);
      }
    }
    return Math.sqrt(sumSquaredDiffs);
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return Number.NaN;
    }
    return 1 - FaceClusterer.cosineDistance(a, b);
  }

  private static clustersToLabels(clusters: number[][], totalPoints: number): number[] {
    const labels = new Int32Array(totalPoints).fill(-1);
    const assignmentCount = new Map<number, number>();

    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
      const cluster = clusters[clusterIndex];
      if (cluster) {
        for (let i = 0; i < cluster.length; i++) {
          const pointIndex = cluster[i];
          if (pointIndex !== undefined) {
            // Check for duplicate assignments
            const currentCount = assignmentCount.get(pointIndex) || 0;
            assignmentCount.set(pointIndex, currentCount + 1);

            if (currentCount > 0) {
              console.warn(`Point ${pointIndex} is being assigned to multiple clusters! Previously assigned to cluster ${labels[pointIndex]}, now trying to assign to cluster ${clusterIndex}`);
            }

            labels[pointIndex] = clusterIndex;
          }
        }
      }
    }

    // Log any points that were assigned multiple times
    const duplicates = Array.from(assignmentCount.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.error(`OPTICS clustering error: ${duplicates.length} points were assigned to multiple clusters:`, duplicates);
    }

    return Array.from(labels);
  }

  private buildClusterResult(
    embeddingVectors: Float32Array[],
    clusterLabels: number[],
    originalEmbeddings: EmbeddingResult[]
  ): ClusterResult {
    const clusterMap = new Map<number, number[]>();
    const outliers: number[] = [];
    clusterLabels.forEach((label, index) => {
      if (label === -1) {
        outliers.push(index);
      } else {
        if (!clusterMap.has(label)) {
          clusterMap.set(label, []);
        }
        const cluster = clusterMap.get(label);
        if (cluster) {
          cluster.push(index);
        }
      }
    });

    // Check for and merge duplicate clusters (workaround for OPTICS bug)
    const mergedClusterMap = this.mergeDuplicateClusters(clusterMap, embeddingVectors);

    const clusters: FaceCluster[] = [];
    let clusterIdCounter = 0;
    for (const memberIndices of mergedClusterMap.values()) {
      if (memberIndices && memberIndices.length > 0) {
        const cluster = this.buildFaceCluster(
          clusterIdCounter.toString(),
          memberIndices,
          embeddingVectors
        );
        clusters.push(cluster);
        clusterIdCounter++;
      }
    }
    return {
      clusters,
      outliers,
      algorithm: this.options.algorithm,
      totalEmbeddings: originalEmbeddings.length,
      options: this.options,
    };
  }

  private mergeDuplicateClusters(
    clusterMap: Map<number, number[]>,
    embeddingVectors: Float32Array[]
  ): Map<number, number[]> {
    const clusters = Array.from(clusterMap.entries());
    const mergedMap = new Map<number, number[]>();
    const processed = new Set<number>();

    for (let i = 0; i < clusters.length; i++) {
      const clusterEntry = clusters[i];
      if (!clusterEntry) { continue; }
      const [labelA, indicesA] = clusterEntry;
      if (processed.has(labelA)) { continue; }

      const mergedIndices = new Set(indicesA);
      processed.add(labelA);

      for (let j = i + 1; j < clusters.length; j++) {
        const otherClusterEntry = clusters[j];
        if (!otherClusterEntry) { continue; }
        const [labelB, indicesB] = otherClusterEntry;
        if (processed.has(labelB)) { continue; }

        const centroidA = this.calculateCentroid(indicesA, embeddingVectors);
        const centroidB = this.calculateCentroid(indicesB, embeddingVectors);
        const distance = FaceClusterer.cosineDistance(
          Array.from(centroidA),
          Array.from(centroidB)
        );

        if (distance < (1 - this.options.threshold)) {
          indicesB.forEach((idx: number) => mergedIndices.add(idx));
          processed.add(labelB);
          console.info(`Merging duplicate clusters ${labelA} and ${labelB} (distance: ${distance.toFixed(3)})`);
        }
      }

      mergedMap.set(labelA, Array.from(mergedIndices) as number[]);
    }

    return mergedMap;
  }

  private buildFaceCluster(
    id: string,
    memberIndices: number[],
    embeddingVectors: Float32Array[]
  ): FaceCluster {
    const centroid = this.calculateCentroid(memberIndices, embeddingVectors);
    const confidence = this.calculateClusterConfidence(memberIndices, embeddingVectors, centroid);
    return {
      id,
      memberIndices,
      centroid: {
        floatEmbedding: Array.from(centroid),
        headIndex: 0,
        headName: 'face_cluster',
      } as unknown as Embedding,
      confidence,
      size: memberIndices.length,
    };
  }

  private calculateCentroid(
    memberIndices: number[],
    embeddingVectors: Float32Array[]
  ): Float32Array {
    if (memberIndices.length === 0) {
      throw new Error('Cannot calculate centroid of empty cluster');
    }
    const validVectors: Float32Array[] = [];
    for (const index of memberIndices) {
      const vector = embeddingVectors[index];
      if (vector !== undefined) {
        validVectors.push(vector);
      }
    }
    if (validVectors.length === 0) {
      throw new Error('No valid vectors found in cluster');
    }
    const first = validVectors[0]!;
    const dims = first.length; // assuming all vectors have the same length
    const centroid = new Float32Array(dims);
    for (let dim = 0; dim < dims; dim++) {
      let sum = 0;
      for (const vector of validVectors) {
        const value = vector[dim];
        if (value !== undefined) {
          sum += value;
        }
      }
      centroid[dim] = sum / validVectors.length;
    }

    return centroid;
  }

  private calculateClusterConfidence(
    memberIndices: number[],
    embeddingVectors: Float32Array[],
    centroid: Float32Array
  ): number {
    if (memberIndices.length === 1) {
      return 1.0;
    }
    let totalSimilarity = 0;
    const centroidArray = Array.from(centroid);
    for (const index of memberIndices) {
      const vector = embeddingVectors[index]!;
      if (vector) {
        const vectorArray = Array.from(vector!);
        const sim = FaceClusterer.cosineSimilarity(vectorArray, centroidArray);
        if (!isNaN(sim) && isFinite(sim)) {
          totalSimilarity += sim;
        }
      }
    }
    const validCount = memberIndices.filter(idx => idx !== undefined).length;
    return validCount > 0 ? totalSimilarity / validCount : 0;
  }

  /**
   * Convenience method for clustering
   * @param embeddings - Array of embedding results to cluster
   * @param options - Clustering options
   * @returns Cluster result
   */
  static cluster(embeddings: EmbeddingResult[], options?: ClusteringOptions): ClusterResult {
    const clusterer = new FaceClusterer(options);
    return clusterer.cluster(embeddings);
  }
}
