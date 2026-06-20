import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  FaceDetectorProvider,
  ImageFaceDetectorProvider,
  VideoFaceDetectorProvider,
} from '../../src/react/providers/FaceDetectorProvider';
import { useFaceDetector } from '../../src/react/hooks/useFaceDetection';
import type { FaceDetectionOptions } from '../../src/types';

const faceDetectorMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  initializeResults: [] as Promise<void>[],
  instances: [] as Array<{
    initialize: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    options: FaceDetectionOptions;
  }>,
}));

vi.mock('../../src/FaceDetector', () => ({
  FaceDetector: vi.fn().mockImplementation(function (options: FaceDetectionOptions) {
    const instance = {
      initialize: vi.fn(() => faceDetectorMocks.initializeResults.shift() ?? Promise.resolve()),
      close: vi.fn(),
      options,
    };
    faceDetectorMocks.instances.push(instance);
    faceDetectorMocks.constructor(options);
    return instance;
  }),
}));

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe('FaceDetectorProvider wrappers', () => {
  beforeEach(() => {
    faceDetectorMocks.constructor.mockClear();
    faceDetectorMocks.initializeResults.length = 0;
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
    await waitFor(() =>
      expect(faceDetectorMocks.instances[0].close).toHaveBeenCalledTimes(1)
    );
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

  it('exposes null while initialization is pending and detector after success', async () => {
    const states: Array<ReturnType<typeof useFaceDetector>> = [];
    const pendingInitialize = createDeferred();
    faceDetectorMocks.initializeResults.push(pendingInitialize.promise);

    const Consumer = () => {
      states.push(useFaceDetector());
      return null;
    };

    render(
      <FaceDetectorProvider options={{ device: 'CPU', mode: 'IMAGE' }}>
        <Consumer />
      </FaceDetectorProvider>
    );

    expect(states.at(-1)).toMatchObject({
      faceDetector: null,
      isLoading: true,
      error: null,
    });

    await waitFor(() => expect(faceDetectorMocks.instances[0].initialize).toHaveBeenCalled());

    pendingInitialize.resolve();

    await waitFor(() =>
      expect(states.at(-1)).toMatchObject({
        faceDetector: faceDetectorMocks.instances[0],
        isLoading: false,
        error: null,
      })
    );
  });

  it('closes an initialized detector on unmount', async () => {
    const { unmount } = render(
      <FaceDetectorProvider options={{ device: 'CPU', mode: 'IMAGE' }}>
        <span>child</span>
      </FaceDetectorProvider>
    );

    await waitFor(() => expect(faceDetectorMocks.instances[0].initialize).toHaveBeenCalled());

    unmount();

    await waitFor(() => expect(faceDetectorMocks.instances[0].close).toHaveBeenCalledTimes(1));
  });

  it('closes a detector if initialization completes after unmount cleanup', async () => {
    const pendingInitialize = createDeferred();
    faceDetectorMocks.initializeResults.push(pendingInitialize.promise);

    const { unmount } = render(
      <FaceDetectorProvider options={{ device: 'CPU', mode: 'IMAGE' }}>
        <span>child</span>
      </FaceDetectorProvider>
    );

    await waitFor(() => expect(faceDetectorMocks.instances[0].initialize).toHaveBeenCalled());

    unmount();
    expect(faceDetectorMocks.instances[0].close).not.toHaveBeenCalled();

    pendingInitialize.resolve();

    await waitFor(() => expect(faceDetectorMocks.instances[0].close).toHaveBeenCalledTimes(1));
  });
});
