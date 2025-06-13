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
  return FaceDetectorProvider({ children, options: { ...options, mode: 'IMAGE' } });
};

export const VideoFaceDetectorProvider = ({
  children,
  options,
}: {
  children: ReactNode;
  options: Omit<FaceDetectorProviderProps['options'], 'mode'>;
}) => {
  return FaceDetectorProvider({ children, options: { ...options, mode: 'VIDEO' } });
};

export const FaceDetectorProvider = ({ children, options }: FaceDetectorProviderProps) => {
  const faceDetector = useMemo(() => new FaceDetector(options), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setError(null);

    const initializeDetector = async () => {
      console.log('Initializing face detector...');
      try {
        setIsLoading(true);
        await faceDetector.initialize();
        setError(null);
      } catch (err) {
        console.error('❌ Face detector initialization failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    initializeDetector();
  }, [faceDetector]);

  const contextValue: FaceDetectorContextType = {
    faceDetector,
    isLoading,
    error,
  };

  return (
    <FaceDetectorContext.Provider value={contextValue}>{children}</FaceDetectorContext.Provider>
  );
};
