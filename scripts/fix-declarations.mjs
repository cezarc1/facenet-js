import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const relativeSpecifierPattern =
  /\b(from\s+['"]|import\s*\(\s*['"]|import\s+['"]|export\s+\*\s+from\s+['"])(\.[^'"]+)(['"])/g;
const sourceMapCommentPattern = /\n?\/\/# sourceMappingURL=.*\.d\.ts\.map\s*$/;

const hasExplicitExtension = specifier => extname(specifier) !== '';

const withJsExtensions = content =>
  content.replace(relativeSpecifierPattern, (match, prefix, specifier, suffix) => {
    if (hasExplicitExtension(specifier)) {
      return match;
    }

    return `${prefix}${specifier}.js${suffix}`;
  });

const collectDeclarationFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectDeclarationFiles(path)));
      continue;
    }

    if (entry.isFile() && path.endsWith('.d.ts')) {
      files.push(path);
    }
  }

  return files;
};

const declarationFiles = await collectDeclarationFiles(distDir);

const copyMapFile = async declarationFile => {
  const mapFile = `${declarationFile}.map`;
  const commonJsMapFile = mapFile.replace(/\.d\.ts\.map$/, '.d.cts.map');
  try {
    await cp(mapFile, commonJsMapFile);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

// Each declaration file is independent, so process them concurrently.
await Promise.all(
  declarationFiles.map(async declarationFile => {
    const original = await readFile(declarationFile, 'utf8');
    const commonJsDeclarationFile = declarationFile.replace(/\.d\.ts$/, '.d.cts');

    await Promise.all([
      writeFile(declarationFile, withJsExtensions(original)),
      writeFile(commonJsDeclarationFile, original.replace(sourceMapCommentPattern, '')),
      copyMapFile(declarationFile),
    ]);
  })
);
