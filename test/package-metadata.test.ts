import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
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

  it('does not require unused TensorFlow or distance packages at runtime', () => {
    expect(packageJson.dependencies?.['@tensorflow/tfjs']).toBeUndefined();
    expect(packageJson.peerDependencies?.['@tensorflow/tfjs']).toBeUndefined();
    expect(packageJson.dependencies?.['ml-distance']).toBeUndefined();
  });

  it('does not define lifecycle scripts that run during install or publish', () => {
    const lifecycleScripts = [
      'preinstall',
      'install',
      'postinstall',
      'prepare',
      'prepublish',
      'prepublishOnly',
      'publish',
      'postpublish',
    ];

    for (const scriptName of lifecycleScripts) {
      expect(packageJson.scripts?.[scriptName]).toBeUndefined();
    }
  });
});
