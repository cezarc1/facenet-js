import React from 'react'
import { Detection } from '@mediapipe/tasks-vision'

export interface FaceHighlightMetrics {
  containerWidth: number
  containerHeight: number
  mediaWidth: number
  mediaHeight: number
  isVideo: boolean
}

interface FaceHighlightProps {
  detection: Detection
  metrics: FaceHighlightMetrics
  isMirrored?: boolean
}

export const FaceHighlight = ({
  detection,
  metrics,
  isMirrored
}: FaceHighlightProps) => {
  const bbox = detection.boundingBox;
  if (!bbox) {
    return null;
  }

  const { containerWidth, containerHeight, mediaWidth, mediaHeight, isVideo } = metrics;
  if (containerWidth === 0 || containerHeight === 0 || mediaWidth === 0 || mediaHeight === 0) {
    return null;
  }

  // Scale bounding box from media coordinates to container coordinates
  const scaleX = containerWidth / mediaWidth;
  const scaleY = containerHeight / mediaHeight;
  const scaledLeft = bbox.originX * scaleX;
  const scaledTop = bbox.originY * scaleY;
  const scaledWidth = bbox.width * scaleX;
  const scaledHeight = bbox.height * scaleY;

  // For mirrored video (webcam), flip horizontally
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
