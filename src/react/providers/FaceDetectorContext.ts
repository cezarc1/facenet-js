import { createContext } from 'react';
import { FaceDetector } from '../../FaceDetector';

export interface FaceDetectorContextType {
  faceDetector: FaceDetector | null;
  isLoading: boolean;
  error: Error | null;
}

export const FaceDetectorContext = createContext<FaceDetectorContextType | null>(null);
