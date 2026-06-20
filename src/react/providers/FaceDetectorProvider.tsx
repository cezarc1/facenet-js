import { ReactNode, useEffect, useMemo, useState } from 'react';
import { FaceDetector } from '../../FaceDetector';
import { FaceDetectionOptions } from '../../types';
import { FaceDetectorContext, FaceDetectorContextType } from './FaceDetectorContext';

export interface FaceDetectorProviderProps {
  children: ReactNode;
  options: FaceDetectionOptions;
}

interface FaceDetectorProviderState extends FaceDetectorContextType {
  optionsKey: string;
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
  const optionsKey = useMemo(
    () => JSON.stringify(faceDetectorOptions),
    [faceDetectorOptions]
  );
  const [contextState, setContextState] = useState<FaceDetectorProviderState>({
    optionsKey: '',
    faceDetector: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;
    let isClosed = false;
    const faceDetector = new FaceDetector(faceDetectorOptions);

    const closeDetector = () => {
      if (!isClosed) {
        isClosed = true;
        faceDetector.close();
      }
    };

    const initializePromise = faceDetector
      .initialize()
      .then(() => {
        if (!isActive) {
          closeDetector();
          return;
        }

        setContextState({
          optionsKey,
          faceDetector,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        closeDetector();

        if (isActive) {
          setContextState({
            optionsKey,
            faceDetector: null,
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });

    return () => {
      isActive = false;
      void initializePromise.then(closeDetector, closeDetector);
    };
  }, [faceDetectorOptions, optionsKey]);

  const contextValue: FaceDetectorContextType = useMemo(() => {
    if (contextState.optionsKey !== optionsKey) {
      return {
        faceDetector: null,
        isLoading: true,
        error: null,
      };
    }

    return {
      faceDetector: contextState.faceDetector,
      isLoading: contextState.isLoading,
      error: contextState.error,
    };
  }, [contextState, optionsKey]);

  return (
    <FaceDetectorContext.Provider value={contextValue}>{children}</FaceDetectorContext.Provider>
  );
};
