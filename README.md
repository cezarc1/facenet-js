# FaceNet.js

A high-performance TypeScript library for face detection and recognition, optimized for in-browser execution with native GPU and CPU support.

Also has helpful React hooks and components for face detection and recognition.

## Demo

[FaceNet.js Demo](https://cezarcocu.com/facenet-js-demo/)

[![npm version](https://img.shields.io/npm/v/facenet-js.svg)](https://www.npmjs.com/package/facenet-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Browser-Optimized**: Built specifically for high-performance in-browser execution
- Real-time face detection with BlazeFace model
- Face recognition using FaceNet embeddings
- Support for both images and video streams
- Hardware acceleration with WebGL/WebGPU for blazing-fast performance
- Privacy-first: All processing happens locally in the browser

## Installation

```bash
npm install facenet-js
```

or with yarn:

```bash
yarn add facenet-js
```

## Quick Start

### Vanilla JavaScript/TypeScript

```typescript
import { FaceDetector } from 'facenet-js';

// Create a face detector instance with GPU acceleration (or CPU fallback)
const detector = new FaceDetector({
  device: 'GPU', // 'GPU' for WebGL/WebGPU acceleration, 'CPU' for compatibility
  mode: 'IMAGE', // 'IMAGE' for photos, 'VIDEO' for real-time streams
  minDetectionConfidence: 0.5,
  embeddingModelPath: '/models/facenet.tflite' // Path to FaceNet model
});

// Initialize the detector (loads models into browser memory)
await detector.initialize();

// Detect faces in an image
const imageElement = document.getElementById('myImage') as HTMLImageElement;
const detections = await detector.detectFromImage(imageElement);

// Get face embeddings for recognition
if (detections.length > 0) {
  const embedding = await detector.embed({
    source: imageElement,
    detection: detections[0]
  });
}
```

### React

```tsx
import { ImageFaceDetectorProvider, useFaceDetector, useFaceSimilarity } from 'facenet-js/react';

function App() {
  return (
    <ImageFaceDetectorProvider
      options={{
        device: 'GPU',
        minDetectionConfidence: 0.5,
        embeddingModelPath: '/models/facenet.tflite'
      }}
    >
      <FaceDetectionComponent />
    </ImageFaceDetectorProvider>
  );
}

function FaceDetectionComponent() {
  const { faceDetector, isLoading, error } = useFaceDetector();
  
  // The face detector is automatically initialized by the provider
  // Use faceDetector.detectFromImage() or faceDetector.detectFromVideo()
}
```

## API Reference

### `FaceDetector`

The main class for face detection and recognition.

#### Constructor

```typescript
new FaceDetector(options: FaceDetectionOptions)
```

**Options:**

- `device`: `'CPU'` | `'GPU'` - Select computation device
  - `'GPU'`: Leverages WebGL/WebGPU for maximum performance
  - `'CPU'`: Fallback option for broader compatibility
- `mode`: `'IMAGE'` | `'VIDEO'` - Detection mode
  - `'IMAGE'`: Optimized for static images
  - `'VIDEO'`: Optimized for real-time video streams
- `minDetectionConfidence`: `number` - Minimum confidence threshold (0-1)
- `embeddingModelPath`: `string` - Path to the FaceNet embedding model (required for face recognition)
- `detectionModelPath?`: `string` - Optional custom path to face detection model
- `wasmPath?`: `string` - Optional custom path to WASM files

#### Methods

##### `initialize(): Promise<void>`

Initializes and loads the face detection models into browser memory. Must be called before detection.

##### `detectFromImage(imageElement: HTMLImageElement): Promise<Detection[]>`

Detects faces in a static image.

##### `detectFromVideo(videoElement: HTMLVideoElement, timestamp: number): Promise<Detection[]>`

Detects faces in a video frame.

##### `embed(request: EmbeddingRequest): Promise<ImageEmbedderResult | null>`

Generates face embeddings for recognition.

**EmbeddingRequest:**

```typescript
{
  source: HTMLImageElement | HTMLVideoElement;
  detection: Detection;
  timestamp?: number; // Required for video
}
```

### React API

#### Providers

##### `ImageFaceDetectorProvider`

A React context provider for image-based face detection.

```tsx
<ImageFaceDetectorProvider options={options}>
  {children}
</ImageFaceDetectorProvider>
```

##### `VideoFaceDetectorProvider`

A React context provider for video-based face detection.

```tsx
<VideoFaceDetectorProvider options={options}>
  {children}
</VideoFaceDetectorProvider>
```

#### Hooks

##### `useFaceDetector()`

Access the face detector instance and its state.

```tsx
const { faceDetector, isLoading, error } = useFaceDetector();
```

Returns:

- `faceDetector`: The FaceDetector instance
- `isLoading`: Boolean indicating if models are loading
- `error`: Error object if initialization failed

##### `useFaceSimilarity(a, b, threshold?)`

Calculate similarity between two face embeddings.

```tsx
const similarity = useFaceSimilarity(embedding1, embedding2, 0.5);
```

Returns:

- `similarity`: Cosine similarity score (-1 to 1)
- `isMatch`: Boolean indicating if faces match (similarity > threshold)
- `message`: Human-readable similarity message

##### `useWebcam()`

Manage webcam access for face detection.

```tsx
const { videoRef, isActive, error, startWebcam, stopWebcam } = useWebcam();
```

## Usage Examples

### Face Detection in Images

```typescript
import { FaceDetector } from 'facenet-js';

async function detectFaces() {
  const detector = new FaceDetector({
    device: 'GPU',
    mode: 'IMAGE',
    minDetectionConfidence: 0.7,
    embeddingModelPath: '/models/facenet.tflite'
  });

  await detector.initialize();

  const img = document.querySelector('#photo') as HTMLImageElement;
  const faces = await detector.detectFromImage(img);

  console.log(`Found ${faces.length} faces`);
  
  faces.forEach((face, index) => {
    console.log(`Face ${index + 1}:`, {
      confidence: face.score,
      boundingBox: face.boundingBox
    });
  });
}
```

### Real-time Video Face Detection

```typescript
import { FaceDetector } from 'facenet-js';

async function startVideoDetection() {
  const detector = new FaceDetector({
    device: 'GPU',
    mode: 'VIDEO',
    minDetectionConfidence: 0.5,
    embeddingModelPath: '/models/facenet.tflite'
  });

  await detector.initialize();

  const video = document.querySelector('#webcam') as HTMLVideoElement;
  
  // Detection loop
  async function detect() {
    const faces = await detector.detectFromVideo(video, performance.now());
    
    // Process detected faces
    faces.forEach(face => {
      // Draw bounding boxes, etc.
    });
    
    requestAnimationFrame(detect);
  }
  
  detect();
}
```

### Face Recognition

```typescript
import { FaceDetector } from 'facenet-js';

async function compareFaces(img1: HTMLImageElement, img2: HTMLImageElement) {
  const detector = new FaceDetector({
    device: 'GPU',
    mode: 'IMAGE',
    minDetectionConfidence: 0.5,
    embeddingModelPath: '/models/facenet.tflite'
  });

  await detector.initialize();

  // Detect faces in both images
  const faces1 = await detector.detectFromImage(img1);
  const faces2 = await detector.detectFromImage(img2);

  if (faces1.length === 0 || faces2.length === 0) {
    console.log('No faces detected');
    return;
  }

  // Get embeddings
  const embedding1 = await detector.embed({
    source: img1,
    detection: faces1[0]
  });

  const embedding2 = await detector.embed({
    source: img2,
    detection: faces2[0]
  });

  if (embedding1 && embedding2) {
    // Calculate cosine similarity
    const similarity = cosineSimilarity(
      embedding1.embeddings[0], 
      embedding2.embeddings[0]
    );
    
    console.log(`Face similarity: ${similarity}`);
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### React Face Comparison Example

```tsx
import { ImageFaceDetectorProvider, VideoFaceDetectorProvider, useFaceDetector, useFaceSimilarity } from 'facenet-js/react';
import { useState } from 'react';

function FaceComparisonApp() {
  const [imageEmbedding, setImageEmbedding] = useState(null);
  const [videoEmbedding, setVideoEmbedding] = useState(null);
  const similarity = useFaceSimilarity(imageEmbedding, videoEmbedding, 0.5);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <ImageFaceDetectorProvider
        options={{
          device: 'GPU',
          minDetectionConfidence: 0.5,
          embeddingModelPath: '/models/facenet.tflite'
        }}
      >
        <ImageUploader onEmbedding={setImageEmbedding} />
      </ImageFaceDetectorProvider>

      <VideoFaceDetectorProvider
        options={{
          device: 'GPU',
          minDetectionConfidence: 0.5,
          embeddingModelPath: '/models/facenet.tflite'
        }}
      >
        <WebcamDetector onEmbedding={setVideoEmbedding} />
      </VideoFaceDetectorProvider>

      {similarity && (
        <div style={{ gridColumn: 'span 2', textAlign: 'center' }}>
          <h3>{similarity.isMatch ? '✅ Match!' : '❌ No Match'}</h3>
          <p>{similarity.message}</p>
        </div>
      )}
    </div>
  );
}
```

## Model Information

This library uses:

- **Face Detection**: MediaPipe's BlazeFace model
- **Face Recognition**: FaceNet model for generating 128-dimensional face embeddings

Note: The FaceNet model file needs to be hosted and accessible. Place it in your public directory as `/models/facenet.tflite`.

## Browser Support

FaceNet.js is designed as a browser-first library with excellent cross-browser compatibility:

- Chrome/Edge 90+
- Firefox 89+
- Safari 15.4+

**Performance Notes:**

- **GPU Mode**: Requires WebGL or WebGPU support for hardware acceleration
- **CPU Mode**: Works on all modern browsers, even without GPU support
- All processing happens locally in the browser - no server calls required

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [FaceNet](https://arxiv.org/abs/1503.03832) (Schroff et al.)
