import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe('package metadata', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
  ) as PackageJson;

  it('keeps React as a peer dependency instead of bundling a second runtime copy', () => {
    expect(packageJson.dependencies?.react).toBeUndefined();
    expect(packageJson.peerDependencies?.react).toBe('>=19.0.0');
  });

  it('pins MediaPipe Tasks Vision to the verified stable release', () => {
    expect(packageJson.dependencies?.['@mediapipe/tasks-vision']).toBe('0.10.35');
    expect(packageJson.peerDependencies?.['@mediapipe/tasks-vision']).toBe('0.10.35');
  });
});
