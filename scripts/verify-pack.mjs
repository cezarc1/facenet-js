import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(
  readFileSync(resolve(rootDir, 'package.json'), 'utf8')
);

const normalizePackagePath = path => path.replace(/^\.\//, '');

const collectPackagePaths = (value, paths = new Set()) => {
  if (typeof value === 'string') {
    paths.add(normalizePackagePath(value));
    return paths;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectPackagePaths(nestedValue, paths);
    }
  }

  return paths;
};

const requiredPaths = collectPackagePaths({
  main: packageJson.main,
  types: packageJson.types,
  exports: packageJson.exports,
});

const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
const [packInfo] = JSON.parse(packOutput);
const packedPaths = new Set(packInfo.files.map(file => file.path));
const missingPaths = [...requiredPaths].filter(path => !packedPaths.has(path));

if (missingPaths.length > 0) {
  console.error('npm pack is missing package entry files:');
  for (const path of missingPaths) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log(`Verified ${requiredPaths.size} package entry files in npm pack dry run.`);
