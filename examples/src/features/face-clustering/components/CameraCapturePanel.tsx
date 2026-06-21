import type { RefObject } from 'react';

interface CameraCapturePanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isMobile: boolean;
  isCaptureDisabled: boolean;
  isCapturing: boolean;
  onSwitchCamera: () => void;
  onCapturePhoto: () => void;
  onStopCamera: () => void;
}

export const CameraCapturePanel = ({
  videoRef,
  canvasRef,
  isMobile,
  isCaptureDisabled,
  isCapturing,
  onSwitchCamera,
  onCapturePhoto,
  onStopCamera,
}: CameraCapturePanelProps) => {
  return (
    <div className="demo-callout demo-callout-info mt-4 space-y-3 p-3">
      <div className="relative bg-[var(--demo-text)] rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-[4/3] object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />
        {isMobile && (
          <button
            onClick={onSwitchCamera}
            className="demo-button demo-button-secondary absolute top-2 right-2 px-3 py-1 text-sm"
          >
            Switch
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={onCapturePhoto}
          disabled={isCaptureDisabled}
          className={`demo-button py-3 px-4 ${isCaptureDisabled ? '' : 'demo-button-success'}`}
        >
          {isCapturing ? 'Capturing...' : 'Capture Photo'}
        </button>
        <button onClick={onStopCamera} className="demo-button demo-button-secondary py-3 px-4">
          Stop Camera
        </button>
      </div>
    </div>
  );
};
