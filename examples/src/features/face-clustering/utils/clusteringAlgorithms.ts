import type { ClusteringAlgorithm } from 'facenet-js';

interface ClusteringAlgorithmInfo {
  name: string;
  link: string;
  description: string;
  pros: string[];
  cons: string[];
}

export const algorithmInfo: Record<ClusteringAlgorithm, ClusteringAlgorithmInfo> = {
  DBSCAN: {
    name: 'DBSCAN',
    link: 'https://en.wikipedia.org/wiki/DBSCAN',
    description:
      'A density-based algorithm that groups points into clusters based on connectivity in high-density regions. It defines clusters as arbitrarily shaped areas separated by sparse regions, allowing it to identify noise.',
    pros: [
      'Automatically discovers the number of clusters',
      'Can find non-spherical, arbitrarily shaped clusters',
      'Excellent at identifying and isolating noise/outliers',
    ],
    cons: [
      'Performance is highly sensitive to the eps and minPts parameters',
      'Struggles significantly with clusters of varying densities (its primary weakness)',
      'The meaning of its density parameter (eps) is less intuitive in high-dimensional space',
    ],
  },
  HIERARCHICAL: {
    name: 'Hierarchical (HAC)',
    link: 'https://en.wikipedia.org/wiki/Hierarchical_clustering',
    description:
      'Builds a "bottom-up" hierarchy of clusters, starting with each face as its own cluster and iteratively merging the closest pairs. The result is a tree-like dendrogram that reveals relationships at all scales.',
    pros: [
      'Does not require knowing the number of clusters in advance',
      'The resulting dendrogram is highly informative for visualizing relationships',
      'Has been shown to be surprisingly robust and effective on smaller, noisy embedding sets',
    ],
    cons: [
      'Computationally infeasible for very very large datasets due to high O(n²) memory and O(n² log n) time complexity',
      'The choice of where to "cut" the dendrogram to get final clusters can be subjective and challenging',
      'Its greedy, irreversible merging decisions made early on can lead to suboptimal results',
    ],
  },
  KMEANS: {
    name: 'K-Means',
    link: 'https://en.wikipedia.org/wiki/K-means_clustering',
    description:
      "A centroid-based algorithm that partitions faces into a pre-specified number (k) of clusters by minimizing the distance from each face to its cluster's centroid (mean point).",
    pros: [
      'Very fast and computationally efficient, with linear scalability (O(n)), making it feasible for very large datasets',
      'Simple to understand and implement',
      'Can be a strong, robust baseline, especially when embedding quality is uncertain',
    ],
    cons: [
      'Requires the user to specify the number of clusters (k) in advance, which is often the unknown goal',
      'Highly sensitive to outliers and random initialization (use of K-Means++ is recommended)',
      'Assumes clusters are spherical and of similar size, which is rarely true for face embeddings',
    ],
  },
  OPTICS: {
    name: 'OPTICS',
    link: 'https://en.wikipedia.org/wiki/OPTICS_algorithm',
    description:
      "A density-based algorithm that orders points to reveal the data's density structure. It overcomes DBSCAN's main weakness by being able to identify clusters of varying densities.",
    pros: [
      'Effectively handles clusters of varying densities (its primary advantage)',
      'Reveals a hierarchical cluster structure through its reachability plot',
      'Not as sensitive to the `eps` parameter for final cluster selection compared to DBSCAN',
    ],
    cons: ['Computationally more expensive than DBSCAN, with O(n²) complexity'],
  },
};

export const algorithmInfoKeys = Object.keys(algorithmInfo) as ClusteringAlgorithm[];

export const getAlgorithmShortDescription = (algorithm: ClusteringAlgorithm) => {
  switch (algorithm) {
    case 'DBSCAN':
      return 'Density-based';
    case 'HIERARCHICAL':
      return 'Tree-based';
    case 'KMEANS':
      return 'Centroid-based';
    case 'OPTICS':
      return 'Density-based+';
  }
};
