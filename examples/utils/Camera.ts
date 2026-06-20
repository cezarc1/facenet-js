export interface CameraOptions {
  onFrame: () => void | Promise<void>;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export class Camera {
  private animationFrameId: number | null = null;
  private lastVideoTime = -1;
  private stream: MediaStream | null = null;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly options: CameraOptions
  ) {}

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not available in this browser');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: this.options.facingMode ?? 'user',
        width: this.options.width ?? 640,
        height: this.options.height ?? 480,
      },
    });

    this.video.srcObject = this.stream;
    await new Promise<void>((resolve, reject) => {
      this.video.onloadedmetadata = () => {
        this.video.play().then(resolve, reject);
      };
      this.video.onerror = () => {
        reject(new Error('Failed to initialize camera video stream'));
      };
    });

    this.scheduleNextFrame();
  }

  async stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }

    this.stream = null;
    this.video.srcObject = null;
    this.lastVideoTime = -1;
  }

  private scheduleNextFrame() {
    this.animationFrameId = requestAnimationFrame(() => {
      void this.handleFrame();
    });
  }

  private async handleFrame() {
    if (!this.stream) {
      return;
    }

    const hasNewFrame =
      !this.video.paused && this.video.currentTime !== this.lastVideoTime;

    if (hasNewFrame) {
      this.lastVideoTime = this.video.currentTime;
      await this.options.onFrame();
    }

    this.scheduleNextFrame();
  }
}
