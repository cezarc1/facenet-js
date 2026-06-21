import type { DragEvent } from 'react';
import { MAX_PROFILE_PHOTOS } from '../utils/profilePhotoHelpers';

interface PhotoDropZoneProps {
  isDragging: boolean;
  disabled: boolean;
  profileInputDisabled: boolean;
  cameraButtonDisabled: boolean;
  cameraButtonClassName: string;
  cameraButtonText: string;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onUploadClick: () => void;
  onCameraToggle: () => void;
}

export const PhotoDropZone = ({
  isDragging,
  disabled,
  profileInputDisabled,
  cameraButtonDisabled,
  cameraButtonClassName,
  cameraButtonText,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
  onCameraToggle,
}: PhotoDropZoneProps) => {
  const dropZoneClassName = `border-2 border-dashed rounded-lg p-8 text-center transition-all ${
    isDragging
      ? 'border-[var(--demo-accent)] bg-[var(--demo-accent-soft)]'
      : disabled
        ? 'border-[var(--demo-border)] bg-[var(--demo-surface-muted)]'
        : 'border-[var(--demo-border)] bg-[var(--demo-surface-muted)] hover:border-[var(--demo-accent)] hover:bg-[var(--demo-accent-soft)]'
  }`;

  return (
    <div
      className={dropZoneClassName}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="space-y-4">
        <div>
          <h4
            className={`text-lg font-medium ${disabled ? 'text-slate-400' : 'text-[var(--demo-text)]'}`}
          >
            {isDragging ? 'Drop photos here!' : 'Add photos to cluster'}
          </h4>
          <p className={`text-sm mt-1 ${disabled ? 'text-slate-400' : 'demo-subtle'}`}>
            Drag and drop multiple photos or click to browse
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 max-w-md mx-auto">
          <button
            onClick={onUploadClick}
            disabled={profileInputDisabled}
            className={`demo-button px-6 py-3 ${profileInputDisabled ? '' : 'demo-button-accent'}`}
          >
            Upload Photos
          </button>
          <button
            onClick={onCameraToggle}
            disabled={cameraButtonDisabled}
            className={`${cameraButtonClassName} px-6 py-3`}
          >
            {cameraButtonText}
          </button>
        </div>
        <div className="text-xs demo-subtle space-y-1">
          <p>• Supports JPG, PNG, WebP (max 10MB each)</p>
          <p>• Add up to {MAX_PROFILE_PHOTOS} photos total</p>
          <p>• Each photo is cropped to one detected face before clustering</p>
        </div>
      </div>
    </div>
  );
};
