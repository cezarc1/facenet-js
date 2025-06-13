import { useContext } from 'react';
import { FaceDetectorContext } from '../providers/FaceDetectorContext';

export const useFaceDetector = () => {
  const context = useContext(FaceDetectorContext);
  if (!context) {
    throw new Error('useFaceDetector must be used within a FaceDetectorProvider');
  }
  return context;
};
