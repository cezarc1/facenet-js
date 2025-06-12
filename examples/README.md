# FaceNet.js Examples

This folder contains a web application demonstrating the FaceNet.js library for face detection and recognition.

## Features

- Face detection using MediaPipe
- Real-time face comparison between a reference photo and webcam feed
- Browser-based processing (no server required)
- Support for both CPU and GPU processing

## Running the Example

1. Install dependencies:

   ```bash
   cd examples
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open your browser at <http://localhost:3000>

## How to Use

1. Click "Upload Reference Photo" to select a reference face image
2. Click "Enable Webcam" to start the camera feed
3. The app will compare faces in real-time and show if they match

All processing happens locally in your browser - no data is sent to any server.
