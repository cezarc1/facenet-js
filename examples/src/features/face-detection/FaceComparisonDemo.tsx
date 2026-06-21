import { EmbeddingResult, FaceDetectionDevice } from 'facenet-js';
import {
  ImageFaceDetectorProvider,
  useFaceSimilarity,
  VideoFaceDetectorProvider,
} from 'facenet-js/react';
import { Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  MediaPipeErrorFallback,
  MediaPipeLoadingFallback,
} from '../../shared/components/MediaPipeFallbacks';
import { FaceDetectionPanel } from './components/FaceDetectionPanel';

const FaceComparisonDemoInner = () => {
  const [device, setDevice] = useState<FaceDetectionDevice>('GPU');
  const [imageEmbedding, setImageEmbedding] = useState<EmbeddingResult | null>(null);
  const [videoEmbedding, setVideoEmbedding] = useState<EmbeddingResult | null>(null);
  const [errors, setErrors] = useState<Error[]>([]);
  const similarity = useFaceSimilarity(imageEmbedding, videoEmbedding);
  const handleError = useCallback((error: Error) => {
    setErrors(prev => {
      if (!prev.includes(error)) {
        return [...prev, error];
      }
      return prev;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleDeviceChange = useCallback((newDevice: FaceDetectionDevice) => {
    setDevice(newDevice);
  }, []);

  return (
    <div className="demo-page">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-16">
        <header className="mb-8">
          <h1 className="demo-heading text-2xl sm:text-3xl mb-2 text-center lg:text-left">
            Face Detection & Biometric Identification
          </h1>
          <p className="text-sm demo-subtle text-center lg:text-left">
            Performed locally in the browser
          </p>
        </header>

        <div className="demo-callout demo-callout-info mb-6">
          <div className="flex justify-center">
            <div>
              <h3 className="font-semibold mb-1">How it works</h3>
              <p className="text-sm">
                Upload a reference photo on the left, then enable your webcam on the right. We'll
                compare the faces in real-time to determine if they match.
              </p>
              <p className="text-xs mt-1 opacity-90">
                All processing happens locally in your browser - no data is sent to any server. View
                the source on{' '}
                <a
                  href="https://github.com/cezarc1/facenet-js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--demo-info)] underline underline-offset-2 hover:text-[var(--demo-primary)]"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
          </div>
        </div>

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

        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ImageFaceDetectorProvider
              options={{
                device,
                minDetectionConfidence: 0.5,
                embeddingModelPath: './facenet.tflite',
              }}
            >
              <FaceDetectionPanel
                key={`image-${device}`}
                mode="IMAGE"
                device={device}
                minDetectionConfidence={0.5}
                onEmbeddingChange={setImageEmbedding}
                onError={handleError}
                title="1. Reference Face"
                buttonText="Upload Reference Photo"
              />
            </ImageFaceDetectorProvider>

            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="demo-card text-2xl font-bold rounded-full p-3 demo-numeric">VS</div>
            </div>

            <VideoFaceDetectorProvider
              options={{
                device,
                minDetectionConfidence: 0.5,
                embeddingModelPath: './facenet.tflite',
              }}
            >
              <FaceDetectionPanel
                key={`video-${device}`}
                mode="VIDEO"
                device={device}
                minDetectionConfidence={0.5}
                onEmbeddingChange={setVideoEmbedding}
                onError={handleError}
                title="2. Face to Compare"
                buttonText="Enable Webcam"
              />
            </VideoFaceDetectorProvider>
          </div>

          <div className="flex lg:hidden justify-center my-4">
            <div className="demo-card rounded-full p-2">
              <svg
                className="w-6 h-6 text-[var(--demo-primary)] transform rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>
        </div>

        {similarity && (
          <div className="mt-6 mb-6">
            <div
              className={`demo-callout font-semibold text-center transition-all transform ${
                similarity.isMatch
                  ? 'scale-105 demo-callout-success'
                  : 'scale-100 demo-callout-warning'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{similarity.isMatch ? '✅' : '❌'}</span>
                <div>
                  <div className="text-xl demo-numeric">{similarity.message}</div>
                  {similarity.isMatch ? (
                    <p className="text-sm mt-1 opacity-90">
                      The faces appear to be the same person
                    </p>
                  ) : (
                    <p className="text-sm mt-1 opacity-90">
                      The faces appear to be different people
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="space-y-6">
          <div className="demo-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="font-medium text-[var(--demo-text)]">Status:</span>
                <span
                  className={`flex items-center gap-1 font-medium ${imageEmbedding && videoEmbedding ? 'text-[var(--demo-success)]' : 'text-[var(--demo-warning)]'}`}
                >
                  {imageEmbedding && videoEmbedding
                    ? 'Ready for comparison'
                    : 'Waiting for face detection...'}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="font-medium text-[var(--demo-text)]">Processing:</span>
                <span className="flex items-center gap-1 demo-subtle">
                  {device}
                  <span className="text-xs demo-subtle">
                    ({device === 'GPU' ? 'likely faster' : 'likely more compatible'})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="demo-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--demo-text)] mb-1">
                  Inference Settings
                </h3>
                <p className="text-sm demo-subtle">
                  Choose processing device for face detection and embedding
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDeviceChange('CPU')}
                  className={`demo-button px-4 py-2 ${
                    device === 'CPU' ? 'demo-button-primary' : 'demo-button-secondary'
                  }`}
                >
                  CPU
                </button>
                <button
                  onClick={() => handleDeviceChange('GPU')}
                  className={`demo-button px-4 py-2 ${
                    device === 'GPU' ? 'demo-button-primary' : 'demo-button-secondary'
                  }`}
                >
                  GPU
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const FaceComparisonDemo = () => {
  return (
    <ErrorBoundary
      FallbackComponent={MediaPipeErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<MediaPipeLoadingFallback />}>
        <FaceComparisonDemoInner />
      </Suspense>
    </ErrorBoundary>
  );
};

export default FaceComparisonDemo;
