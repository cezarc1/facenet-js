import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from '../utils/Camera';

export type ImageCaptureState = 'idle' | 'camera-preview' | 'captured';

export interface UseImageCaptureOptions {
  onImageCapture?: (imageData: string) => void;
  onError?: (error: Error) => void;
}

export interface UseImageCaptureReturn {
  imageSource: string | null;
  captureState: ImageCaptureState;
  isProcessing: boolean;
  error: Error | null;
  facingMode: 'user' | 'environment';
  isMobile: boolean;
  actions: {
    uploadImage: (file: File) => void;
    startCamera: () => Promise<void>;
    capturePhoto: () => void;
    clearImage: () => void;
    stopCamera: () => void;
    switchCamera: () => Promise<void>;
  };
  refs: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
  };
}

export const useImageCapture = (options: UseImageCaptureOptions = {}): UseImageCaptureReturn => {
  const { onImageCapture, onError } = options;
  
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<ImageCaptureState>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );
  
  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsProcessing(false);
    onError?.(err);
  }, [onError]);
  
  const uploadImage = useCallback((file: File) => {
    setIsProcessing(true);
    setError(null);
    
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      setImageSource(result);
      setCaptureState('captured');
      setIsProcessing(false);
      onImageCapture?.(result);
    };
    
    reader.onerror = () => {
      handleError(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  }, [handleError, onImageCapture]);
  
  const startCamera = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setCaptureState('camera-preview');
      
      // Wait for next tick to ensure video element is rendered
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (!videoRef.current) {
        handleError(new Error('Video element not initialized'));
        setCaptureState('idle');
        return;
      }
      
      // Stop any existing camera
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      
      // Initialize new camera
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: () => {
          // Camera is running, no need to process frames here
        },
        facingMode,
        width: 640,
        height: 480
      });
      
      await cameraRef.current.start();
      setIsProcessing(false);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to start camera'));
      setCaptureState('idle');
    }
  }, [facingMode, handleError]);
  
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      handleError(new Error('Video or canvas element not initialized'));
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Validate video dimensions
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Video stream not ready - please try again');
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Reset any previous transformations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Flip horizontally for mirror effect (matches camera preview)
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setImageSource(imageData);
      setCaptureState('captured');
      setIsProcessing(false);
      
      // Stop camera after capture
      stopCamera();
      
      onImageCapture?.(imageData);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to capture photo'));
    }
  }, [handleError, onImageCapture, stopCamera]);
  
  const clearImage = useCallback(() => {
    setImageSource(null);
    setCaptureState('idle');
    setError(null);
    stopCamera();
  }, [stopCamera]);
  
  const switchCamera = useCallback(async () => {
    if (!isMobile) return;
    
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    // If camera is active, restart with new facing mode
    if (captureState === 'camera-preview' && videoRef.current && cameraRef.current) {
      try {
        cameraRef.current.stop();
        cameraRef.current = new Camera(videoRef.current, {
          onFrame: () => {
            // Camera is running, no need to process frames here
          },
          facingMode: newMode,
          width: 640,
          height: 480
        });
        await cameraRef.current.start();
      } catch (err) {
        handleError(err instanceof Error ? err : new Error('Failed to switch camera'));
      }
    }
  }, [facingMode, captureState, isMobile, handleError]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);
  
  return {
    imageSource,
    captureState,
    isProcessing,
    error,
    facingMode,
    isMobile,
    actions: {
      uploadImage,
      startCamera,
      capturePhoto,
      clearImage,
      stopCamera,
      switchCamera
    },
    refs: {
      videoRef,
      canvasRef,
      fileInputRef
    }
  };
};
