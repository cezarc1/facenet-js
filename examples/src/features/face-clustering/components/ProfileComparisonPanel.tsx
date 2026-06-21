import type { EmbeddingResult, FaceCluster } from 'facenet-js';
import { VideoFaceDetectorProvider } from 'facenet-js/react';
import { useCallback, useMemo, useState } from 'react';
import { FaceDetectionPanel } from '../../face-detection/components/FaceDetectionPanel';
import { calculateProfileSimilarity } from '../utils/profilePhotoHelpers';

interface ProfileComparisonPanelProps {
  selectedCluster: FaceCluster | null;
  isProfileStale: boolean;
  onError: (error: Error) => void;
}

export const ProfileComparisonPanel = ({
  selectedCluster,
  isProfileStale,
  onError,
}: ProfileComparisonPanelProps) => {
  const [webcamMatch, setWebcamMatch] = useState<{
    cluster: FaceCluster;
    embedding: EmbeddingResult;
  } | null>(null);

  const handleWebcamEmbeddingChange = useCallback(
    (embedding: EmbeddingResult | null) => {
      if (!selectedCluster || !embedding) {
        setWebcamMatch(null);
        return;
      }

      setWebcamMatch({ cluster: selectedCluster, embedding });
    },
    [selectedCluster]
  );

  const webcamEmbedding = webcamMatch?.cluster === selectedCluster ? webcamMatch.embedding : null;
  const profileSimilarity = useMemo(
    () => calculateProfileSimilarity(selectedCluster, webcamEmbedding),
    [selectedCluster, webcamEmbedding]
  );

  if (isProfileStale) {
    return (
      <div className="demo-card p-4">
        <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-2">Webcam Comparison</h3>
        <p className="text-sm text-[var(--demo-warning)]">
          Rebuild the profile before comparing it with your webcam.
        </p>
      </div>
    );
  }

  if (!selectedCluster) {
    return (
      <div className="demo-card p-4">
        <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-2">Webcam Comparison</h3>
        <p className="text-sm demo-subtle">
          Select a cluster to compare that profile with your current webcam face.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VideoFaceDetectorProvider
        options={{
          device: 'GPU',
          minDetectionConfidence: 0.5,
          embeddingModelPath: './facenet.tflite',
        }}
      >
        <FaceDetectionPanel
          key={selectedCluster.id}
          mode="VIDEO"
          device="GPU"
          minDetectionConfidence={0.5}
          onEmbeddingChange={handleWebcamEmbeddingChange}
          onError={onError}
          title="Webcam Comparison"
          buttonText="Enable Webcam"
        />
      </VideoFaceDetectorProvider>

      {profileSimilarity && (
        <div
          className={`demo-callout font-semibold text-center ${
            profileSimilarity.isMatch ? 'demo-callout-success' : 'demo-callout-warning'
          }`}
        >
          <div className="demo-numeric">{profileSimilarity.message}</div>
          <p className="text-sm mt-1 opacity-90">
            {profileSimilarity.isMatch
              ? 'The webcam face is close to the selected profile.'
              : 'The webcam face is not close to the selected profile yet.'}
          </p>
        </div>
      )}
    </div>
  );
};
