import { beforeAll } from 'vitest';

beforeAll(() => {
  global.Image = class Image {
    naturalWidth = 640;
    naturalHeight = 480;
    src = '';
    onload: (() => void) | null = null;
    onerror: ((error: any) => void) | null = null;
  } as any;
}); 