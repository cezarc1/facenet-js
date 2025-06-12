import { useFaceDetector } from 'facenet-js/react'
import { FaceDetectionDevice, FaceDetectionMode } from 'facenet-js'
import { Camera } from '@mediapipe/camera_utils'
import { Detection, Embedding } from '@mediapipe/tasks-vision'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { FaceHighlight } from './FaceHighlight'

interface FaceDetectionPanelProps {
  mode: FaceDetectionMode
  device?: FaceDetectionDevice
  minDetectionConfidence?: number
  onEmbeddingChange?: (embedding: Embedding | null, detection?: Detection) => void
  onError?: (error: Error) => void
  disabled?: boolean
  title: string
  buttonText: string
}

export const FaceDetectionPanel = ({
  mode,
  device = 'GPU',
  onEmbeddingChange,
  onError,
  disabled = false,
  title,
  buttonText
}: FaceDetectionPanelProps) => {
  const { faceDetector, isLoading, error: detectorError } = useFaceDetector();
  const [detection, setDetection] = useState<Detection | null>(null);
  const [embedding, setEmbedding] = useState<Embedding | null>(null);
  const [processingError, setProcessingError] = useState<Error | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (onEmbeddingChange && embedding && detection) {
      onEmbeddingChange(embedding, detection)
    }
  }, [embedding, detection, onEmbeddingChange])

  useEffect(() => {
    const error = detectorError || processingError
    if (error && onError) {
      onError(error)
    }
  }, [detectorError, processingError, onError])

  const detectFromImage = useCallback(async (imageElement: HTMLImageElement) => {
    if (!faceDetector) {
      setProcessingError(new Error('Face detector not initialized'));
      return;
    }

    try {
      setProcessingError(null);
      const detections = await faceDetector.detectFromImage(imageElement);

      if (detections.length === 0) {
        setDetection(null);
        setEmbedding(null);
        throw new Error('No face detected in the uploaded image');
      }
      const firstDetection = detections[0]!;
      setDetection(firstDetection);
      const embeddingResult = await faceDetector.embed({
        source: imageElement,
        detection: firstDetection
      });

      if (embeddingResult?.embeddings[0]) {
        setEmbedding(embeddingResult.embeddings[0]);
      }
    } catch (error) {
      console.error('Face detection error:', error);
      setProcessingError(error instanceof Error ? error : new Error(String(error)));
      setDetection(null);
      setEmbedding(null);
    }
  }, [faceDetector]);

  const detectFromVideo = useCallback(async (videoElement: HTMLVideoElement, timestamp: number) => {
    if (!faceDetector || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    try {
      const detections = await faceDetector.detectFromVideo(videoElement, timestamp);
      if (detections.length === 0) {
        setDetection(null);
        return;
      }
      const firstDetection = detections[0];
      setDetection(firstDetection);
      const embeddingResult = await faceDetector.embed({
        source: videoElement,
        detection: firstDetection,
        timestamp
      });

      if (embeddingResult?.embeddings[0]) {
        setEmbedding(embeddingResult.embeddings[0]);
      }
    } catch (error) {
      console.error('Video face detection error:', error);
      setProcessingError(error instanceof Error ? error : new Error(String(error)));
      setDetection(null);
      setEmbedding(null);
    } finally {
      isProcessingRef.current = false;
    }
  }, [faceDetector]);

  const handleImageUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) {
      console.error('No file selected')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = reader.result as string
        imageRef.current.onload = async () => {
          try {
            await detectFromImage(imageRef.current!)
          } catch (error) {
            console.error('Face detection error:', error);
          }
        }
      }
    }
    reader.onerror = () => {
      console.error('FileReader error')
    }

    reader.readAsDataURL(event.target.files[0])
  }, [detectFromImage])

  const handleWebcamEnable = useCallback(async () => {
    if (!videoRef.current) {
      setProcessingError(new Error('Video element not initialized'));
      return;
    }
    try {
      if (cameraRef.current) {
        await cameraRef.current.stop();
      }
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && !isProcessingRef.current) {
            const timestamp = performance.now();
            await detectFromVideo(videoRef.current, timestamp);
          }
        },
        facingMode: 'user',
        width: 640,
        height: 480
      });
      await cameraRef.current.start();
      setIsWebcamActive(true);
      setProcessingError(null);
    } catch (error) {
      console.error('Camera initialization error:', error);
      setProcessingError(error instanceof Error ? error : new Error('Failed to start camera'));
      setIsWebcamActive(false);
    }
  }, [detectFromVideo]);

  const stopWebcam = useCallback(async () => {
    if (cameraRef.current) {
      try {
        await cameraRef.current.stop();
        cameraRef.current = null;
        setIsWebcamActive(false);
        setDetection(null);
        setEmbedding(null);
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop().catch(console.error);
        cameraRef.current = null;
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-60 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading {mode.toLowerCase()} models...</p>
            <p className="text-xs text-gray-500 mt-1">Using {device} acceleration</p>
          </div>
        </div>
      </div>
    )
  }

  const error = detectorError || processingError
  const isDisabled = disabled || isLoading || !!error

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <span className="font-medium">Error:</span> {error.message}
        </div>
      )}

      {mode === 'IMAGE' ? (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-4 ${isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
              }`}
          >
            {buttonText}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isDisabled}
          />
          <div className="relative bg-gray-50 rounded-lg overflow-hidden h-60">
            <img
              ref={imageRef}
              alt="Uploaded"
              className="w-full h-full object-contain"
              style={{ display: imageRef.current?.src ? 'block' : 'none' }}
            />
            {detection && <FaceHighlight
              detection={detection}
              containerRef={imageRef}
            />}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={isWebcamActive ? stopWebcam : handleWebcamEnable}
            disabled={isDisabled}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-4 ${isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isWebcamActive
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
              }`}
          >
            {isWebcamActive ? 'Stop Webcam' : buttonText}
          </button>
          <div className="relative bg-gray-50 rounded-lg h-60">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full transform -scale-x-100" />
            {detection && <FaceHighlight
              detection={detection}
              containerRef={videoRef}
              isMirrored={true}
            />}
          </div>
        </>
      )}

      {detection && (
        <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="text-green-500">✓</span>
            <span className="font-medium">
              Face detected (Confidence: {Math.round(detection.categories[0].score * 100)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 