import React from 'react';
import { UseImageCaptureReturn } from '../hooks/useImageCapture';

interface ImageCaptureControlsProps {
  imageCapture: UseImageCaptureReturn;
  className?: string;
}

export const ImageCaptureControls: React.FC<ImageCaptureControlsProps> = ({ 
  imageCapture, 
  className = '' 
}) => {
  const { imageSource, captureState, isProcessing, error, actions, refs, isMobile, facingMode } = imageCapture;
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      actions.uploadImage(file);
    }
  };
  
  return (
    <div className={className}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <span className="font-medium">Error:</span> {error.message}
        </div>
      )}
      
      {captureState === 'idle' && !imageSource && (
        <div className="space-y-3">
          <button
            onClick={() => refs.fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700 shadow-sm disabled:bg-gray-300 disabled:text-gray-500"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Photo
            </span>
          </button>
          
          <button
            onClick={actions.startCamera}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:bg-gray-300 disabled:text-gray-500"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </span>
          </button>
          
          <input
            ref={refs.fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
      
      {captureState === 'camera-preview' && (
        <div className="space-y-3">
          <div className="relative bg-gray-50 rounded-lg overflow-hidden">
            <video
              ref={refs.videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-60 object-cover transform -scale-x-100"
            />
            <canvas 
              ref={refs.canvasRef} 
              className="hidden" 
            />
            {isMobile && (
              <button
                onClick={actions.switchCamera}
                className="absolute top-2 right-2 p-2 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-all"
                title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={actions.capturePhoto}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:bg-gray-300 disabled:text-gray-500"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture
              </span>
            </button>
            
            <button
              onClick={actions.stopCamera}
              className="py-3 px-4 rounded-lg font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700 shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {captureState === 'captured' && imageSource && (
        <div className="space-y-3">
          <div className="relative bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={imageSource}
              alt="Captured"
              className="w-full h-60 object-contain"
            />
          </div>
          
          <button
            onClick={actions.clearImage}
            className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700 shadow-sm text-sm"
          >
            Change Photo
          </button>
        </div>
      )}
    </div>
  );
};