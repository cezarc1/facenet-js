import { ClusteringOptions } from 'facenet-js';
import {
  type FaceSource,
  ImageFaceDetectorProvider,
  useFaceClustering,
  useMultiFaceEmbeddings,
} from 'facenet-js/react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  MediaPipeErrorFallback,
  MediaPipeLoadingFallback,
} from '../../shared/components/MediaPipeFallbacks';
import { ClusterDisplay } from './components/ClusterDisplay';
import { ClusteringSettings } from './components/ClusteringSettings';
import { PhotoUploadArea } from './components/PhotoUploadArea';
import { ProfileComparisonPanel } from './components/ProfileComparisonPanel';
import {
  getPhotoListKey,
  getProfileClusterCounts,
  getProfileClusteringDefaults,
} from './utils/profilePhotoHelpers';

const getProfileBuilderMessage = ({
  isProfileStale,
  hasSelectableClusters,
  hasClusterResult,
  hasBuiltProfile,
}: {
  isProfileStale: boolean;
  hasSelectableClusters: boolean;
  hasClusterResult: boolean;
  hasBuiltProfile: boolean;
}) => {
  if (isProfileStale) {
    return 'Photo changes are not in the current profile yet.';
  }

  if (hasSelectableClusters) {
    return 'Profile is ready. Select a cluster, then compare it with your webcam.';
  }

  if (hasClusterResult) {
    return 'No clusters formed yet. Try looser settings or clearer matching angles, then rebuild.';
  }

  if (hasBuiltProfile) {
    return 'Building profile from the selected photos.';
  }

  return 'Build a profile after adding the photos you want to compare.';
};

const FaceClusteringDemoInner = () => {
  const [photos, setPhotos] = useState<FaceSource[]>([]);
  const [profilePhotos, setProfilePhotos] = useState<FaceSource[]>([]);
  const [clusteringOptions, setClusteringOptions] = useState<Required<ClusteringOptions>>(
    getProfileClusteringDefaults
  );
  const [errors, setErrors] = useState<Error[]>([]);
  const [clusterTags, setClusterTags] = useState<Record<string, string>>({});
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

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

  const handlePhotosChange = useCallback((nextPhotos: FaceSource[]) => {
    setPhotos(nextPhotos);
    setSelectedClusterId(null);
    setErrors([]);

    if (nextPhotos.length === 0) {
      setProfilePhotos([]);
      setClusterTags({});
    }
  }, []);

  const handleClusteringOptionsChange = useCallback((newOptions: ClusteringOptions) => {
    setClusteringOptions({ ...getProfileClusteringDefaults(), ...newOptions });
  }, []);

  const handleBuildProfile = useCallback(() => {
    if (photos.length === 0) {
      handleError(new Error('Add at least one photo before building a profile.'));
      return;
    }

    setProfilePhotos([...photos]);
    setSelectedClusterId(null);
    setErrors([]);
  }, [handleError, photos]);

  const handleClusterTag = useCallback((clusterId: string, tag: string) => {
    setClusterTags(prev => ({
      ...prev,
      [clusterId]: tag,
    }));
  }, []);

  const {
    embeddings,
    embeddingsWithSource,
    isLoading: embeddingsLoading,
    error: embeddingsError,
    progress,
  } = useMultiFaceEmbeddings(profilePhotos);
  const {
    clusters,
    isLoading: clusteringLoading,
    error: clusteringError,
  } = useFaceClustering(embeddings.length > 0 ? embeddings : null, clusteringOptions);

  const currentPhotoKey = useMemo(() => getPhotoListKey(photos), [photos]);
  const profilePhotoKey = useMemo(() => getPhotoListKey(profilePhotos), [profilePhotos]);
  const isProfileStale = profilePhotos.length > 0 && currentPhotoKey !== profilePhotoKey;
  const selectedCluster = useMemo(() => {
    if (!clusters || !selectedClusterId) {
      return null;
    }

    return clusters.clusters.find(cluster => cluster.id === selectedClusterId) ?? null;
  }, [clusters, selectedClusterId]);

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
  const clusterCounts = useMemo(() => getProfileClusterCounts(clusters), [clusters]);
  const hasBuiltProfile = profilePhotos.length > 0;
  const canBuildProfile = hasPhotos && !isProcessing;
  const profileBuilderMessage = getProfileBuilderMessage({
    isProfileStale,
    hasSelectableClusters: clusterCounts.hasSelectableClusters,
    hasClusterResult: clusterCounts.hasClusterResult,
    hasBuiltProfile,
  });

  return (
    <div className="demo-page">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 xl:pr-[420px] pb-16">
        <header className="mb-8">
          <h1 className="demo-heading text-2xl sm:text-3xl mb-2 text-center lg:text-left">
            Face Embedding Clustering
          </h1>
          <p className="text-sm demo-subtle text-center lg:text-left">
            Add photos and automatically group faces by person using various embedding clustering
            algorithms. All done locally in your browser. Clustering different angles of the same
            face should generally improve identification accuracy.
          </p>
        </header>

        {errors.length > 0 && (
          <div className="demo-callout demo-callout-danger mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">Errors:</h4>
                <ul className="text-sm mt-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error.message}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={clearErrors}
                className="demo-button demo-button-danger ml-4 px-3 py-1 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {hasPhotos && !isProcessing && (
                <ClusteringSettings
                  options={clusteringOptions}
                  onOptionsChange={handleClusteringOptionsChange}
                  totalFaces={embeddings.length || photos.length}
                  disabled={isProcessing}
                />
              )}

              {hasPhotos && (
                <div className="demo-card p-4">
                  <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-3">
                    Profile Builder
                  </h3>
                  <p className="text-sm demo-subtle mb-4">{profileBuilderMessage}</p>
                  <button
                    onClick={handleBuildProfile}
                    disabled={!canBuildProfile}
                    className={`demo-button w-full py-3 px-4 ${
                      canBuildProfile ? 'demo-button-accent' : ''
                    }`}
                  >
                    {hasBuiltProfile ? 'Rebuild Profile' : 'Build Profile'}
                  </button>
                </div>
              )}

              {hasPhotos && !isProcessing && (
                <div className="demo-card p-4">
                  <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-3">
                    Analysis Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="demo-stat demo-stat-info">
                      <div className="text-2xl font-bold demo-numeric">{photos.length}</div>
                      <div className="text-sm">Photos</div>
                    </div>
                    <div className="demo-stat demo-stat-success">
                      <div className="text-2xl font-bold demo-numeric">{embeddings.length}</div>
                      <div className="text-sm">Profile Faces</div>
                    </div>
                    <div className="demo-stat demo-stat-accent">
                      <div className="text-2xl font-bold demo-numeric">
                        {clusterCounts.clusters}
                      </div>
                      <div className="text-sm">Clusters</div>
                    </div>
                    <div className="demo-stat demo-stat-warning">
                      <div className="text-2xl font-bold demo-numeric">
                        {clusterCounts.outliers}
                      </div>
                      <div className="text-sm">Outliers</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="xl:fixed xl:top-28 xl:right-6 xl:z-30 xl:w-[380px] xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:rounded-lg xl:shadow-xl">
                <ProfileComparisonPanel
                  selectedCluster={selectedCluster}
                  isProfileStale={isProfileStale}
                  onError={handleError}
                />
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <PhotoUploadArea
                photos={photos}
                onPhotosChange={handlePhotosChange}
                onError={handleError}
                disabled={isProcessing}
              />

              {hasBuiltProfile && isProcessing && (
                <div className="demo-card p-4">
                  <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-3">
                    Processing Photos
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Analyzing faces in photos...</span>
                      <span className="text-[var(--demo-accent)] font-medium demo-numeric">
                        {progress.current}/{progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="demo-progress w-full">
                      <div
                        className="demo-progress-fill transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    {embeddingsLoading && (
                      <p className="text-xs demo-subtle">
                        Detecting faces and generating embeddings...
                      </p>
                    )}
                    {clusteringLoading && (
                      <p className="text-xs demo-subtle">
                        Clustering faces using {clusteringOptions.algorithm} algorithm...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {clusters && clusterCounts.hasClusterResult && !isProcessing && (
                <>
                  {isProfileStale && (
                    <div className="demo-callout demo-callout-warning">
                      <h3 className="text-sm font-semibold">Profile needs rebuild</h3>
                      <p className="text-sm mt-1">
                        The clusters below use the last built photo set. Rebuild before comparing
                        with the webcam.
                      </p>
                    </div>
                  )}
                  <ClusterDisplay
                    clusters={clusters}
                    embeddingsWithSource={embeddingsWithSource}
                    photos={profilePhotos}
                    onClusterTag={handleClusterTag}
                    clusterTags={clusterTags}
                    selectedClusterId={selectedClusterId}
                    onClusterSelect={isProfileStale ? undefined : setSelectedClusterId}
                  />
                </>
              )}

              {hasBuiltProfile && !isProcessing && embeddings.length === 0 && (
                <div className="demo-callout demo-callout-warning p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">No Faces Detected</h3>
                  <p className="text-sm">
                    We couldn't detect any faces in the uploaded photos. Try uploading clearer
                    images with visible faces.
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
      <Suspense
        fallback={
          <MediaPipeLoadingFallback
            spinnerColor="accent"
            message="Downloading vision models (~3MB) for face clustering..."
          />
        }
      >
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
