import { Camera, type CameraOptions } from './Camera';

export type CameraFacingMode = NonNullable<CameraOptions['facingMode']>;

const DEFAULT_CAMERA_CONSTRAINTS = {
  width: 640,
  height: 480,
} as const;

export const startCameraSession = async (
  video: HTMLVideoElement,
  options: CameraOptions
): Promise<Camera> => {
  const camera = new Camera(video, {
    ...DEFAULT_CAMERA_CONSTRAINTS,
    ...options,
  });

  await camera.start();
  return camera;
};

export const stopCameraSession = (camera: Camera | null) => {
  camera?.stop();
};
