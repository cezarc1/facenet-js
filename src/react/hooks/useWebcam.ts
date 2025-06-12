import { useCallback, useRef, useState } from 'react';

export const useWebcam = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWebcam = useCallback(async () => {
    if (!navigator.mediaDevices || !videoRef.current) {
      setError('Webcam not supported');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsActive(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam');
      return false;
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  return { videoRef, isActive, error, startWebcam, stopWebcam };
};
