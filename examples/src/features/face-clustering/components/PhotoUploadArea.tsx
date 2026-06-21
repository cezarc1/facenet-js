import { useFaceDetector, type FaceSource } from 'facenet-js/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type { Camera } from '../../../shared/camera/Camera';
import { startCameraSession, stopCameraSession } from '../../../shared/camera/cameraSession';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import {
  createFaceSourceFromDataUrl,
  cropImageToFaceDataUrl,
  MAX_PROFILE_PHOTOS,
  readFileAsDataUrl,
  validateImageFiles,
} from '../utils/profilePhotoHelpers';
import { CameraCapturePanel } from './CameraCapturePanel';
import { PhotoDropZone } from './PhotoDropZone';
import { ProfilePhotoGrid } from './ProfilePhotoGrid';

const getCameraButtonVariant = (isDisabled: boolean, isActive: boolean) => {
  if (isDisabled) {
    return '';
  }

  if (isActive) {
    return 'demo-button-secondary';
  }

  return 'demo-button-primary';
};

const getCameraButtonText = (
  isActive: boolean,
  isStarting: boolean,
  startLabel: string,
  startingLabel = 'Starting Camera...'
) => {
  if (isActive) {
    return 'Stop Camera';
  }

  if (isStarting) {
    return startingLabel;
  }

  return startLabel;
};

interface PhotoUploadAreaProps {
  photos: FaceSource[];
  onPhotosChange: (photos: FaceSource[]) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
}

export const PhotoUploadArea = ({
  photos,
  onPhotosChange,
  onError,
  disabled = false,
}: PhotoUploadAreaProps) => {
  const { faceDetector, isLoading: detectorLoading } = useFaceDetector();
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const isMobile = useIsMobile();

  const remainingSlots = MAX_PROFILE_PHOTOS - photos.length;
  const profileInputDisabled = disabled || detectorLoading || !faceDetector || remainingSlots <= 0;
  const cameraButtonDisabled = (profileInputDisabled && !isCameraActive) || isCameraStarting;
  const cameraButtonClassName = `demo-button ${getCameraButtonVariant(cameraButtonDisabled, isCameraActive)}`;
  const emptyStateCameraButtonText = getCameraButtonText(
    isCameraActive,
    isCameraStarting,
    'Take Photos'
  );
  const filledStateCameraButtonText = getCameraButtonText(
    isCameraActive,
    isCameraStarting,
    'Take More',
    'Starting...'
  );

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      stopCameraSession(cameraRef.current);
      cameraRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  }, []);

  const createProfilePhotoFromDataUrl = useCallback(
    async (imageData: string, id: string): Promise<FaceSource> => {
      if (!faceDetector) {
        throw new Error('Face detector is still loading. Try again in a moment.');
      }

      const source = await createFaceSourceFromDataUrl(imageData, id);
      const detections = faceDetector.detectFromImage(source.image);

      if (detections.length === 0) {
        throw new Error('No face detected. Use a clearer photo with one visible face.');
      }

      if (detections.length > 1) {
        throw new Error('Multiple faces detected. Use one face per profile photo.');
      }

      const detection = detections[0];
      if (!detection) {
        throw new Error('No face detected. Use a clearer photo with one visible face.');
      }

      const croppedFaceDataUrl = cropImageToFaceDataUrl(source.image, detection);
      return createFaceSourceFromDataUrl(croppedFaceDataUrl, id);
    },
    [faceDetector]
  );

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (disabled) return;

      const { validFiles, errors } = validateImageFiles(files, remainingSlots);
      for (const error of errors) {
        onError(new Error(error));
      }

      if (validFiles.length === 0) {
        return;
      }

      try {
        const idPrefix = `upload-${Date.now()}`;
        const newPhotos: FaceSource[] = [];

        for (const [index, file] of validFiles.entries()) {
          const imageData = await readFileAsDataUrl(file);
          const photo = await createProfilePhotoFromDataUrl(imageData, `${idPrefix}-${index}`);
          newPhotos.push(photo);
        }

        onPhotosChange([...photos, ...newPhotos]);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Failed to process photos'));
      }
    },
    [createProfilePhotoFromDataUrl, disabled, onError, onPhotosChange, photos, remainingSlots]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!disabled && e.dataTransfer.files) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!disabled && e.target.files) {
        void handleFiles(e.target.files);
      }
      e.target.value = '';
    },
    [disabled, handleFiles]
  );

  const handleClearPhotos = useCallback(() => {
    stopCamera();
    onPhotosChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onPhotosChange, stopCamera]);

  const removePhoto = useCallback(
    (photoId: string) => {
      onPhotosChange(photos.filter(photo => photo.id !== photoId));
    },
    [photos, onPhotosChange]
  );

  const startCamera = useCallback(async () => {
    if (disabled || detectorLoading || !faceDetector) return;
    if (remainingSlots <= 0) {
      onError(new Error(`Too many photos. Maximum ${MAX_PROFILE_PHOTOS} photos allowed.`));
      return;
    }

    setIsCameraActive(true);
    setIsCameraStarting(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    if (!videoRef.current) {
      setIsCameraActive(false);
      setIsCameraStarting(false);
      onError(new Error('Video element not initialized'));
      return;
    }

    try {
      stopCameraSession(cameraRef.current);
      cameraRef.current = await startCameraSession(videoRef.current, {
        onFrame: () => {},
        facingMode,
      });
      setIsCameraStarting(false);
    } catch (error) {
      stopCamera();
      onError(error instanceof Error ? error : new Error('Failed to start camera'));
    }
  }, [detectorLoading, disabled, faceDetector, facingMode, onError, remainingSlots, stopCamera]);

  const restartCamera = useCallback(
    async (nextFacingMode: 'user' | 'environment') => {
      if (!videoRef.current || !cameraRef.current) return;

      try {
        stopCameraSession(cameraRef.current);
        cameraRef.current = await startCameraSession(videoRef.current, {
          onFrame: () => {},
          facingMode: nextFacingMode,
        });
      } catch (error) {
        stopCamera();
        onError(error instanceof Error ? error : new Error('Failed to switch camera'));
      }
    },
    [onError, stopCamera]
  );

  const switchCamera = useCallback(async () => {
    if (!isMobile) return;

    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacingMode);

    if (isCameraActive) {
      await restartCamera(nextFacingMode);
    }
  }, [facingMode, isCameraActive, isMobile, restartCamera]);

  const handleCameraToggle = useCallback(() => {
    if (isCameraActive) {
      stopCamera();
      return;
    }

    void startCamera();
  }, [isCameraActive, startCamera, stopCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      onError(new Error('Video or canvas element not initialized'));
      return;
    }

    if (remainingSlots <= 0) {
      onError(new Error(`Too many photos. Maximum ${MAX_PROFILE_PHOTOS} photos allowed.`));
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      onError(new Error('Video stream not ready - please try again'));
      return;
    }

    try {
      setIsCapturing(true);
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      const photo = await createProfilePhotoFromDataUrl(
        imageData,
        `capture-${Date.now()}-${photos.length}`
      );
      onPhotosChange([...photos, photo]);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to capture photo'));
    } finally {
      setIsCapturing(false);
    }
  }, [createProfilePhotoFromDataUrl, onError, onPhotosChange, photos, remainingSlots]);

  useEffect(() => stopCamera, [stopCamera]);

  const hasPhotos = photos.length > 0;

  return (
    <div className="demo-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--demo-text)]">Profile Photos</h3>
          <p className="text-sm demo-subtle">
            Add face-focused angles from uploads or your device camera.
          </p>
        </div>
        <p className="text-sm demo-subtle demo-numeric">
          {photos.length}/{MAX_PROFILE_PHOTOS} photos
        </p>
      </div>

      {!hasPhotos ? (
        <PhotoDropZone
          isDragging={isDragging}
          disabled={disabled}
          profileInputDisabled={profileInputDisabled}
          cameraButtonDisabled={cameraButtonDisabled}
          cameraButtonClassName={cameraButtonClassName}
          cameraButtonText={emptyStateCameraButtonText}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onUploadClick={() => fileInputRef.current?.click()}
          onCameraToggle={handleCameraToggle}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm demo-subtle demo-numeric">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} added
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={profileInputDisabled}
                className={`demo-button px-3 py-1 text-sm ${
                  profileInputDisabled ? '' : 'demo-button-accent'
                }`}
              >
                Add Photos
              </button>
              <button
                onClick={handleCameraToggle}
                disabled={cameraButtonDisabled}
                className={`${cameraButtonClassName} px-3 py-1 text-sm`}
              >
                {filledStateCameraButtonText}
              </button>
              <button
                onClick={handleClearPhotos}
                disabled={disabled}
                className={`demo-button px-3 py-1 text-sm ${disabled ? '' : 'demo-button-danger'}`}
              >
                Clear All
              </button>
            </div>
          </div>

          <ProfilePhotoGrid photos={photos} disabled={disabled} onRemovePhoto={removePhoto} />
        </div>
      )}

      {isCameraActive && (
        <CameraCapturePanel
          videoRef={videoRef}
          canvasRef={canvasRef}
          isMobile={isMobile}
          isCaptureDisabled={profileInputDisabled || isCapturing}
          isCapturing={isCapturing}
          onSwitchCamera={() => {
            void switchCamera();
          }}
          onCapturePhoto={() => {
            void capturePhoto();
          }}
          onStopCamera={stopCamera}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};
