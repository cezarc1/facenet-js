import React from 'react'
import { Detection } from '@mediapipe/tasks-vision'

interface FaceHighlightProps {
  detection: Detection
  containerRef: React.RefObject<HTMLVideoElement | HTMLImageElement | null>
  isMirrored?: boolean
}

export const FaceHighlight = ({
  detection,
  containerRef,
  isMirrored
}: FaceHighlightProps) => {
  if (!containerRef.current || !detection) {
    return null
  }

  const container = containerRef.current;
  const { offsetWidth: containerWidth, offsetHeight: containerHeight } = container;
  // If container has no dimensions, don't render highlights
  if (containerWidth === 0 || containerHeight === 0) {
    return null
  }

  const bbox = detection.boundingBox;
  if (!bbox) {
    return null;
  }

  let mediaWidth: number, mediaHeight: number;
  if (container instanceof HTMLVideoElement) {
    mediaWidth = container.videoWidth || containerWidth;
    mediaHeight = container.videoHeight || containerHeight;
  } else {
    mediaWidth = container.naturalWidth || containerWidth;
    mediaHeight = container.naturalHeight || containerHeight;
  }

  // Scale bounding box from media coordinates to container coordinates
  const scaleX = containerWidth / mediaWidth;
  const scaleY = containerHeight / mediaHeight;
  const scaledLeft = bbox.originX * scaleX;
  const scaledTop = bbox.originY * scaleY;
  const scaledWidth = bbox.width * scaleX;
  const scaledHeight = bbox.height * scaleY;

  // For mirrored video (webcam), flip horizontally
  const isVideo = container instanceof HTMLVideoElement;
  const left = isVideo && isMirrored ? containerWidth - scaledLeft - scaledWidth : scaledLeft;

  return (
    <React.Fragment key={0}>
      <div
        className="absolute border-2 border-green-400 bg-opacity-25 z-[1]"
        style={{
          left: `${left}px`,
          top: `${scaledTop}px`,
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
        }}
      />
      <p
        className="absolute bg-green-600 text-white text-xs px-2 py-1 z-20 rounded"
        style={{
          left: `${left}px`,
          top: `${scaledTop - 28}px`,
          maxWidth: `${scaledWidth}px`,
        }}
      >
        Face: {Math.round(detection.categories[0].score * 100)}%
      </p>
      {detection.keypoints?.map((keypoint, kpIndex) => (
        <span
          key={`keypoint-${kpIndex}`}
          className="absolute w-2 h-2 bg-blue-500 rounded-full z-30 transform -translate-x-1 -translate-y-1"
          style={{
            left: `${isVideo ? containerWidth - (keypoint.x * scaleX) : keypoint.x * scaleX}px`,
            top: `${keypoint.y * scaleY}px`,
          }}
        />
      ))}
    </React.Fragment>
  )
} 