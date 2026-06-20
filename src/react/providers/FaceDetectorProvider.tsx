import { ReactNode, useEffect, useMemo, useState } from 'react';
import { FaceDetector } from '../../FaceDetector';
import { FaceDetectionOptions } from '../../types';
import { FaceDetectorContext, FaceDetectorContextType } from './FaceDetectorContext';

export interface FaceDetectorProviderProps {
  children: ReactNode;
  options: FaceDetectionOptions;
}

export const ImageFaceDetectorProvider = ({
  children,
  options,
}: {
  children: ReactNode;
  options: Omit<FaceDetectorProviderProps['options'], 'mode'>;
}) => {
  return <FaceDetectorProvider options={{ ...options, mode: 'IMAGE' }}>{children}</FaceDetectorProvider>;
};

export const VideoFaceDetectorProvider = ({
  children,
  options,
}: {
  children: ReactNode;
  options: Omit<FaceDetectorProviderProps['options'], 'mode'>;
}) => {
  return <FaceDetectorProvider options={{ ...options, mode: 'VIDEO' }}>{children}</FaceDetectorProvider>;
};

export const FaceDetectorProvider = ({ children, options }: FaceDetectorProviderProps) => {
  const {
    detectionModelPath,
    device,
    embeddingModelPath,
    minDetectionConfidence,
    mode,
    wasmPath,
  } = options;
  const faceDetectorOptions = useMemo(
    () => ({
      detectionModelPath,
      device,
      embeddingModelPath,
      minDetectionConfidence,
      mode,
      wasmPath,
    }),
    [detectionModelPath, device, embeddingModelPath, minDetectionConfidence, mode, wasmPath]
  );
  const faceDetector = useMemo(
    () => new FaceDetector(faceDetectorOptions),
    [faceDetectorOptions]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;

    const initializeDetector = async () => {
      await Promise.resolve();
      console.info('Initializing face detector...');
      try {
        setError(null);
        setIsLoading(true);
        await faceDetector.initialize();
        if (isActive) {
          setError(null);
        }
      } catch (err) {
        console.error('❌ Face detector initialization failed:', err);
        if (isActive) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void initializeDetector();

    return () => {
      isActive = false;
    };
  }, [faceDetector]);

  const contextValue: FaceDetectorContextType = useMemo(
    () => ({
      faceDetector,
      isLoading,
      error,
    }),
    [error, faceDetector, isLoading]
  );

  return (
    <FaceDetectorContext.Provider value={contextValue}>{children}</FaceDetectorContext.Provider>
  );
};
