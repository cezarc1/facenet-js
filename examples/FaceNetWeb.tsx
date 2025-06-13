import { EmbeddingResult, FaceDetectionDevice } from 'facenet-js';
import { ImageFaceDetectorProvider, useFaceSimilarity, VideoFaceDetectorProvider } from 'facenet-js/react';
import { Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FaceDetectionPanel } from './components/FaceDetectionPanel';

function MediaPipeErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
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
            {error.message}
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
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Loading MediaPipe</h2>
        <p className="text-gray-600 text-sm">
          Downloading vision models (~3MB)...
        </p>
      </div>
    </div>
  );
}

const FaceNetWebInner = () => {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-16">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-teal-700 mb-2 text-center lg:text-left">
            Face Detection & Biometric Identification
          </h1>
          <p className="text-sm text-gray-600 text-center lg:text-left">
            Performed in the browser with MediaPipe & Facenet
          </p>
        </header>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-center">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How it works</h3>
              <p className="text-blue-800 text-sm">
                Upload a reference photo on the left, then enable your webcam on the right.
                We'll compare the faces in real-time to determine if they match.
              </p>
              <p className="text-blue-700 text-xs mt-1">
                All processing happens locally in your browser - no data is sent to any server.
              </p>
            </div>
          </div>
        </div>

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

            {/* Comparison Indicator */}
            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-white text-2xl font-bold rounded-full p-3 shadow-lg border-2 border-gray-200">
                VS
              </div>
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

          {/* Mobile Comparison Indicator */}
          <div className="flex lg:hidden justify-center my-4">
            <div className="bg-white rounded-full p-2 shadow border border-gray-200">
              <svg
                className="w-6 h-6 text-teal-600 transform rotate-90"
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

        {/* Similarity Result */}
        {similarity && (
          <div className="mt-6 mb-6">
            <div className={`p-6 rounded-lg font-semibold text-center transition-all shadow-lg transform ${similarity.isMatch ? 'scale-105' : 'scale-100'
              } ${similarity.isMatch
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
              }`}>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">
                  {similarity.isMatch ? '✅' : '❌'}
                </span>
                <div>
                  <div className="text-xl">
                    {similarity.message}
                  </div>
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
          {/* Status Information */}
          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`flex items-center gap-1 ${imageEmbedding && videoEmbedding ? 'text-green-600 font-medium' : 'text-amber-600'}`}>
                  {imageEmbedding && videoEmbedding ? 'Ready for comparison' : 'Waiting for face detection...'}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="font-medium text-gray-700">Processing:</span>
                <span className="flex items-center gap-1 text-gray-600">
                  {device}
                  <span className="text-xs text-gray-500">
                    ({device === 'GPU' ? 'likely faster' : 'likely more compatible'})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Inference Settings</h3>
                <p className="text-sm text-gray-600">Choose processing device for face detection and embedding</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDeviceChange('CPU')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${device === 'CPU'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  CPU
                </button>
                <button
                  onClick={() => handleDeviceChange('GPU')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${device === 'GPU'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
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

const FaceNetWeb = () => {
  return (
    <ErrorBoundary
      FallbackComponent={MediaPipeErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<MediaPipeLoadingFallback />}>
        <FaceNetWebInner />
      </Suspense>
    </ErrorBoundary>
  );
};

export default FaceNetWeb;
