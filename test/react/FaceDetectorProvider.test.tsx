import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ImageFaceDetectorProvider,
  VideoFaceDetectorProvider,
} from '../../src/react/providers/FaceDetectorProvider';
import type { FaceDetectionOptions } from '../../src/types';

const faceDetectorMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  instances: [] as Array<{ initialize: ReturnType<typeof vi.fn>; options: FaceDetectionOptions }>,
}));

vi.mock('../../src/FaceDetector', () => ({
  FaceDetector: vi.fn().mockImplementation(function (options: FaceDetectionOptions) {
    const instance = {
      initialize: vi.fn().mockResolvedValue(undefined),
      options,
    };
    faceDetectorMocks.instances.push(instance);
    faceDetectorMocks.constructor(options);
    return instance;
  }),
}));

describe('FaceDetectorProvider wrappers', () => {
  beforeEach(() => {
    faceDetectorMocks.constructor.mockClear();
    faceDetectorMocks.instances.length = 0;
  });

  it('creates image detector options and recreates the detector when options change', async () => {
    const initialOptions = {
      device: 'CPU' as const,
      minDetectionConfidence: 0.5,
      embeddingModelPath: '/facenet.tflite',
    };
    const nextOptions = {
      ...initialOptions,
      device: 'GPU' as const,
      minDetectionConfidence: 0.75,
    };

    const { rerender } = render(
      <ImageFaceDetectorProvider options={initialOptions}>
        <span>child</span>
      </ImageFaceDetectorProvider>
    );

    await waitFor(() => expect(faceDetectorMocks.instances[0]?.initialize).toHaveBeenCalled());
    expect(faceDetectorMocks.constructor).toHaveBeenLastCalledWith({
      ...initialOptions,
      mode: 'IMAGE',
    });

    rerender(
      <ImageFaceDetectorProvider options={nextOptions}>
        <span>child</span>
      </ImageFaceDetectorProvider>
    );

    await waitFor(() => expect(faceDetectorMocks.instances[1]?.initialize).toHaveBeenCalled());
    expect(faceDetectorMocks.constructor).toHaveBeenLastCalledWith({
      ...nextOptions,
      mode: 'IMAGE',
    });
  });

  it('creates video detector options through the video wrapper', async () => {
    const options = {
      device: 'CPU' as const,
      minDetectionConfidence: 0.5,
      embeddingModelPath: '/facenet.tflite',
    };

    render(
      <VideoFaceDetectorProvider options={options}>
        <span>child</span>
      </VideoFaceDetectorProvider>
    );

    await waitFor(() => expect(faceDetectorMocks.instances[0]?.initialize).toHaveBeenCalled());
    expect(faceDetectorMocks.constructor).toHaveBeenLastCalledWith({
      ...options,
      mode: 'VIDEO',
    });
  });
});
