import { FaceDetectorContext } from '@/react/providers/FaceDetectorContext';
import { useContext } from 'react';

export const useFaceDetector = () => {
  const context = useContext(FaceDetectorContext);
  if (!context) {
    throw new Error('useFaceDetector must be used within a FaceDetectorProvider');
  }
  return context;
};
