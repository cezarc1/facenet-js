import { ClusteringOptions, DEFAULT_OPTIONS } from 'facenet-js';
import { FaceSource, ImageFaceDetectorProvider, useFaceClustering, useMultiFaceEmbeddings } from 'facenet-js/react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ClusterDisplay } from './components/ClusterDisplay';
import { ClusteringSettings } from './components/ClusteringSettings';
import { GitHubStats } from './components/GitHubStats';
import { PhotoUploadArea } from './components/PhotoUploadArea';

function MediaPipeErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-lg font-semibold text-red-700 mb-2">MediaPipe Loading Failed</h2>
        <p className="text-gray-600 mb-4">
          Failed to load MediaPipe models. Please check your internet connection and try again.
        </p>
        <details className="mb-4">
          <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
            {errorMessage}
          </pre>
        </details>
        <button
          onClick={resetErrorBoundary}
          className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function MediaPipeLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Loading MediaPipe</h2>
        <p className="text-gray-600 text-sm">
          Downloading vision models (~3MB) for face clustering...
        </p>
      </div>
    </div>
  );
}

const FaceClusteringDemoInner = () => {
  const [photos, setPhotos] = useState<FaceSource[]>([]);
  const [clusteringOptions, setClusteringOptions] = useState<Required<ClusteringOptions>>({
    ...DEFAULT_OPTIONS
  });
  const [errors, setErrors] = useState<Error[]>([]);
  const [clusterTags, setClusterTags] = useState<Record<string, string>>({});

  const handleError = useCallback((error: Error) => {
    setErrors(prev => {
      if (!prev.some(e => e.message === error.message)) {
        return [...prev, error];
      }
      return prev;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handlePhotosUpload = useCallback((newPhotos: FaceSource[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
    setErrors([]);
  }, []);

  const handleClusteringOptionsChange = useCallback((newOptions: ClusteringOptions) => {
    setClusteringOptions({ ...DEFAULT_OPTIONS, ...newOptions } as Required<ClusteringOptions>);
  }, []);

  const handleClusterTag = useCallback((clusterId: string, tag: string) => {
    setClusterTags(prev => ({
      ...prev,
      [clusterId]: tag
    }));
  }, []);

  const { embeddings, embeddingsWithSource, isLoading: embeddingsLoading, error: embeddingsError, progress } = useMultiFaceEmbeddings(photos);
  const { clusters, isLoading: clusteringLoading, error: clusteringError } = useFaceClustering(
    embeddings.length > 0 ? embeddings : null,
    clusteringOptions
  );

  useEffect(() => {
    if (embeddingsError) {
      let isActive = true;
      queueMicrotask(() => {
        if (isActive) {
          handleError(embeddingsError);
        }
      });

      return () => {
        isActive = false;
      };
    }
  }, [embeddingsError, handleError]);

  useEffect(() => {
    if (clusteringError) {
      let isActive = true;
      queueMicrotask(() => {
        if (isActive) {
          handleError(clusteringError);
        }
      });

      return () => {
        isActive = false;
      };
    }
  }, [clusteringError, handleError]);

  const isProcessing = embeddingsLoading || clusteringLoading;
  const hasPhotos = photos.length > 0;
  const hasResults = clusters && clusters.clusters.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-16">
        <header className="mb-8 relative">
          {/* GitHub Stats */}
          <GitHubStats
            owner="cezarc1"
            repo="facenet-js"
            className="absolute top-0 right-0"
          />

          <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 mb-2 text-center lg:text-left">
            Face Embedding Clustering
          </h1>
          <p className="text-sm text-gray-600 text-center lg:text-left">
            Add photos and automatically group faces by person using various embedding clustering algorithms. All done locally in your browser, on CPU.
          </p>
        </header>

        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-red-700">Errors:</h4>
                <ul className="text-red-600 text-sm mt-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error.message}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={clearErrors}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Clustering Settings */}
              {hasPhotos && !isProcessing && embeddings.length > 0 && (
                <ClusteringSettings
                  options={clusteringOptions}
                  onOptionsChange={handleClusteringOptionsChange}
                  totalFaces={embeddings.length}
                  disabled={isProcessing}
                />
              )}

              {/* Results Summary */}
              {hasPhotos && !isProcessing && (
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Analysis Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{photos.length}</div>
                      <div className="text-sm text-blue-700">Photos</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{embeddings.length}</div>
                      <div className="text-sm text-green-700">Faces Found</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-600">
                        {hasResults ? clusters.clusters.length : 0}
                      </div>
                      <div className="text-sm text-purple-700">Clusters</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">
                        {hasResults ? clusters.outliers.length : 0}
                      </div>
                      <div className="text-sm text-orange-700">Outliers</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Photos and Clusters */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photo Upload Area */}
              <PhotoUploadArea
                onPhotosUpload={handlePhotosUpload}
                onError={handleError}
                disabled={isProcessing}
              />

              {/* Progress Display */}
              {hasPhotos && isProcessing && (
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Processing Photos</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Analyzing faces in photos...</span>
                      <span className="text-purple-600 font-medium">
                        {progress.current}/{progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    {embeddingsLoading && (
                      <p className="text-xs text-gray-500">
                        Detecting faces and generating embeddings...
                      </p>
                    )}
                    {clusteringLoading && (
                      <p className="text-xs text-gray-500">
                        Clustering faces using {clusteringOptions.algorithm} algorithm...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Cluster Results */}
              {hasResults && !isProcessing && (
                <ClusterDisplay
                  clusters={clusters}
                  embeddingsWithSource={embeddingsWithSource}
                  photos={photos}
                  onClusterTag={handleClusterTag}
                  clusterTags={clusterTags}
                />
              )}

              {/* No Results Message */}
              {hasPhotos && !isProcessing && embeddings.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <div className="text-yellow-600 text-4xl mb-2">😔</div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Faces Detected</h3>
                  <p className="text-yellow-700 text-sm">
                    We couldn't detect any faces in the uploaded photos. Try uploading clearer images with visible faces.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaceClusteringDemo = () => {
  return (
    <ErrorBoundary
      FallbackComponent={MediaPipeErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<MediaPipeLoadingFallback />}>
        <ImageFaceDetectorProvider
          options={{
            device: 'GPU',
            minDetectionConfidence: 0.5,
            embeddingModelPath: './facenet.tflite',
          }}
        >
          <FaceClusteringDemoInner />
        </ImageFaceDetectorProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

export default FaceClusteringDemo;
