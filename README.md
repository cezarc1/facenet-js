# FaceNet.js

A TypeScript library for face detection and recognition using TensorFlow.js and MediaPipe.

[![npm version](https://img.shields.io/npm/v/facenet-js.svg)](https://www.npmjs.com/package/facenet-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 Real-time face detection using MediaPipe's BlazeFace model
- 🧠 Face recognition using FaceNet embeddings
- 📸 Support for both images and video streams
- 🚀 Hardware acceleration with WebGL/WebGPU
- 📦 TypeScript support with full type definitions
- ⚡ Optimized for web browsers

## Installation

```bash
npm install facenet-js
```

or with yarn:

```bash
yarn add facenet-js
```

## Quick Start

```typescript
import { FaceDetector } from 'facenet-js';

// Create a face detector instance
const detector = new FaceDetector({
  device: 'GPU', // or 'CPU'
  mode: 'IMAGE', // or 'VIDEO'
  minDetectionConfidence: 0.5
});

// Initialize the detector
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

## API Reference

### `FaceDetector`

The main class for face detection and recognition.

#### Constructor

```typescript
new FaceDetector(options: FaceDetectionOptions)
```

**Options:**

- `device`: `'CPU'` | `'GPU'` - Choose computation device
- `mode`: `'IMAGE'` | `'VIDEO'` - Detection mode
- `minDetectionConfidence`: `number` - Minimum confidence threshold (0-1)

#### Methods

##### `initialize(): Promise<void>`

Initializes the MediaPipe models. Must be called before detection.

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

## Usage Examples

### Face Detection in Images

```typescript
import { FaceDetector } from 'facenet-js';

async function detectFaces() {
  const detector = new FaceDetector({
    device: 'GPU',
    mode: 'IMAGE',
    minDetectionConfidence: 0.7
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
    minDetectionConfidence: 0.5
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
    minDetectionConfidence: 0.5
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

## Model Information

This library uses:

- **Face Detection**: MediaPipe's BlazeFace model
- **Face Recognition**: FaceNet model for generating 128-dimensional face embeddings

Note: The FaceNet model file needs to be hosted and accessible. Place it in your public directory as `/models/facenet.tflite`.

## Browser Support

- Chrome/Edge 90+
- Firefox 89+
- Safari 15.4+

WebGL or WebGPU support is required for GPU acceleration.

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for providing the face detection models
- [TensorFlow.js](https://www.tensorflow.org/js) for the machine learning framework
- [FaceNet](https://arxiv.org/abs/1503.03832) paper by Schroff et al.
