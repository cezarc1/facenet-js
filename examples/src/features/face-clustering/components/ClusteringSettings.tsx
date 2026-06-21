import { useCallback, useState } from 'react';
import { ClusteringAlgorithm, ClusteringOptions } from 'facenet-js';
import {
  algorithmInfo,
  algorithmInfoKeys,
  getAlgorithmShortDescription,
} from '../utils/clusteringAlgorithms';

interface ClusteringSettingsProps {
  options: ClusteringOptions;
  onOptionsChange: (options: ClusteringOptions) => void;
  totalFaces: number;
  disabled?: boolean;
  showComparisonMode?: boolean;
  onComparisonToggle?: (enabled: boolean) => void;
}

export const ClusteringSettings = ({
  options,
  onOptionsChange,
  totalFaces,
  disabled = false,
  showComparisonMode = false,
  onComparisonToggle,
}: ClusteringSettingsProps) => {
  const [maxClustersInput, setMaxClustersInput] = useState<string>(
    (options.maxClusters ?? 1).toString()
  );
  const [maxClustersError, setMaxClustersError] = useState<string>('');
  const [maxClustersWarning, setMaxClustersWarning] = useState<string>('');
  const handleAlgorithmChange = useCallback(
    (algorithm: ClusteringAlgorithm) => {
      const newOptions: ClusteringOptions = { ...options, algorithm };
      switch (algorithm) {
        case 'KMEANS':
          newOptions.maxClusters = options.algorithm === 'KMEANS' ? (options.maxClusters ?? 1) : 1;
          setMaxClustersInput(newOptions.maxClusters.toString());
          setMaxClustersError('');
          setMaxClustersWarning('');
          break;
        case 'DBSCAN':
        case 'OPTICS':
          newOptions.minSamples = Math.max(2, Math.min(Math.ceil(totalFaces / 10), 5));
          break;
        case 'HIERARCHICAL':
          // Hierarchical clustering doesn't need special defaults
          break;
      }

      onOptionsChange(newOptions);
    },
    [options, onOptionsChange, totalFaces]
  );

  const handleThresholdChange = useCallback(
    (threshold: number) => {
      onOptionsChange({ ...options, threshold });
    },
    [options, onOptionsChange]
  );

  const handleMinSamplesChange = useCallback(
    (minSamples: number) => {
      onOptionsChange({ ...options, minSamples });
    },
    [options, onOptionsChange]
  );

  const handleMaxClustersChange = useCallback(
    (maxClusters: number) => {
      onOptionsChange({ ...options, maxClusters });
    },
    [options, onOptionsChange]
  );

  const handleMaxClustersInputChange = useCallback(
    (value: string) => {
      setMaxClustersInput(value);
      setMaxClustersError('');
      setMaxClustersWarning('');

      if (value === '') {
        return;
      }

      const numValue = parseInt(value, 10);
      // For K-means, theoretical max is totalFaces, but practically totalFaces-1 is more useful
      // We'll allow up to totalFaces but warn if it's too high
      const maxAllowed = totalFaces;
      if (isNaN(numValue)) {
        setMaxClustersError('Please enter a valid number');
        return;
      }

      if (numValue < 1) {
        setMaxClustersError('Minimum value is 1');
        return;
      }

      if (numValue > maxAllowed) {
        setMaxClustersError(`Maximum value is ${maxAllowed} (total faces detected)`);
        return;
      }

      // Warn about potentially impractical cluster counts
      if (numValue > Math.ceil(totalFaces * 0.8)) {
        setMaxClustersWarning(`${numValue} clusters may be too fragmented for practical use`);
      }
      handleMaxClustersChange(numValue);
    },
    [handleMaxClustersChange, totalFaces]
  );

  const handleMaxClustersBlur = useCallback(() => {
    if (maxClustersInput === '' || maxClustersError) {
      setMaxClustersInput((options.maxClusters ?? 1).toString());
      setMaxClustersError('');
      setMaxClustersWarning('');
    }
  }, [maxClustersInput, maxClustersError, options.maxClusters]);

  return (
    <div className="demo-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--demo-text)]">Clustering Settings</h3>
        {onComparisonToggle && (
          <div className="flex items-center space-x-2">
            <span className="text-sm demo-subtle">Algorithm Comparison Mode</span>
            <button
              onClick={() => onComparisonToggle(!showComparisonMode)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--demo-accent)] focus:ring-offset-2 ${
                showComparisonMode ? 'bg-[var(--demo-accent)]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                  showComparisonMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Algorithm Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--demo-text)] mb-3">
            Clustering Algorithm
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {algorithmInfoKeys.map(algorithm => (
              <button
                key={algorithm}
                onClick={() => handleAlgorithmChange(algorithm)}
                disabled={disabled}
                className={`demo-option p-3 text-left transition-all ${
                  options.algorithm === algorithm
                    ? 'demo-option-selected'
                    : disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : ''
                }`}
              >
                <div className="font-medium text-sm">{algorithmInfo[algorithm].name}</div>
                <div className="text-xs mt-1 opacity-75">
                  {getAlgorithmShortDescription(algorithm)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Similarity Threshold - Only for algorithms that use it */}
        {(options.algorithm === 'DBSCAN' ||
          options.algorithm === 'OPTICS' ||
          options.algorithm === 'HIERARCHICAL') && (
          <div>
            <label className="block text-sm font-medium text-[var(--demo-text)] mb-2">
              Similarity Threshold
              <span className="ml-2 text-[var(--demo-accent)] font-semibold demo-numeric">
                {options.threshold?.toFixed(2)}
              </span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={options.threshold || 0.7}
                onChange={e => handleThresholdChange(parseFloat(e.target.value))}
                disabled={disabled}
                className={`w-full h-2 bg-slate-200 accent-[var(--demo-accent)] rounded-lg appearance-none cursor-pointer ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <div className="flex justify-between text-xs demo-subtle">
                <span>0.3 (Loose)</span>
                <span>0.6 (Balanced)</span>
                <span>0.95 (Strict)</span>
              </div>
            </div>
            <p className="text-xs demo-subtle mt-1">
              Higher values require faces to be more similar to be grouped together.
            </p>
          </div>
        )}

        {/* Distance Metric - Only for HIERARCHICAL */}
        {options.algorithm === 'HIERARCHICAL' && (
          <div>
            <label className="block text-sm font-medium text-[var(--demo-text)] mb-2">
              Distance Metric
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onOptionsChange({ ...options, distanceMetric: 'cosine' })}
                disabled={disabled}
                className={`demo-option p-3 text-left transition-all ${
                  (options.distanceMetric || 'cosine') === 'cosine'
                    ? 'demo-option-selected'
                    : disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : ''
                }`}
              >
                <div className="font-medium text-sm">Cosine</div>
                <div className="text-xs mt-1 opacity-75">Best for normalized embeddings</div>
              </button>
              <button
                onClick={() => onOptionsChange({ ...options, distanceMetric: 'euclidean' })}
                disabled={disabled}
                className={`demo-option p-3 text-left transition-all ${
                  options.distanceMetric === 'euclidean'
                    ? 'demo-option-selected'
                    : disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : ''
                }`}
              >
                <div className="font-medium text-sm">Euclidean</div>
                <div className="text-xs mt-1 opacity-75">Standard distance metric</div>
              </button>
            </div>
            <p className="text-xs demo-subtle mt-1">
              Cosine distance is typically better for face embeddings as it focuses on direction
              rather than magnitude.
            </p>
          </div>
        )}

        {/* Minimum Cluster Size - Only for DBSCAN and OPTICS */}
        {(options.algorithm === 'DBSCAN' || options.algorithm === 'OPTICS') && (
          <div>
            <label className="block text-sm font-medium text-[var(--demo-text)] mb-2">
              Minimum Cluster Size
            </label>
            <input
              type="number"
              min="2"
              value={options.minSamples || 2}
              onChange={e => handleMinSamplesChange(parseInt(e.target.value))}
              disabled={disabled}
              className={`demo-input demo-numeric w-24 px-3 py-2 text-sm ${
                maxClustersError
                  ? 'border-[var(--demo-danger)] bg-[var(--demo-danger-soft)]'
                  : maxClustersWarning
                    ? 'border-[var(--demo-warning)] bg-[var(--demo-warning-soft)]'
                    : disabled
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : ''
              }`}
            />
            <p className="text-xs demo-subtle mt-1">
              Minimum number of faces required to form a cluster.
            </p>
          </div>
        )}

        {/* Maximum Clusters - Only for KMEANS */}
        {options.algorithm === 'KMEANS' && (
          <div>
            <label className="block text-sm font-medium text-[var(--demo-text)] mb-2">
              Maximum Clusters
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max={totalFaces}
                  value={maxClustersInput}
                  onChange={e => handleMaxClustersInputChange(e.target.value)}
                  onBlur={handleMaxClustersBlur}
                  disabled={disabled}
                  className={`demo-input demo-numeric w-24 px-3 py-2 text-sm ${
                    maxClustersError
                      ? 'border-[var(--demo-danger)] bg-[var(--demo-danger-soft)]'
                      : maxClustersWarning
                        ? 'border-[var(--demo-warning)] bg-[var(--demo-warning-soft)]'
                        : disabled
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : ''
                  }`}
                  placeholder="10"
                />
                <div className="flex-1">
                  <p className="text-xs demo-subtle">
                    Maximum number of clusters to create. Range: 1-{totalFaces}
                  </p>
                  <p className="text-xs demo-subtle mt-0.5">
                    {totalFaces > 10
                      ? `Higher values (>${Math.ceil(totalFaces / 2)}) may create overly fragmented clusters.`
                      : 'Actual clusters may be fewer than this limit.'}
                  </p>
                </div>
              </div>
              {maxClustersError && (
                <p className="text-xs text-[var(--demo-danger)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {maxClustersError}
                </p>
              )}
              {maxClustersWarning && !maxClustersError && (
                <p className="text-xs text-[var(--demo-warning)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {maxClustersWarning}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
