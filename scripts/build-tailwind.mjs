import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { compile } from 'tailwindcss';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const inputPath = path.join(projectRoot, 'src', 'input.css');
const outputPath = path.join(projectRoot, 'dist', 'tailwind.css');

const inputCss = await readFile(inputPath, 'utf8');

const filesToScan = [
  path.join(projectRoot, 'index.html'),
  path.join(projectRoot, 'js', 'main.js'),
  path.join(projectRoot, 'js', 'utils.js'),
  path.join(projectRoot, 'css', 'style.css'),
];

const candidateSet = new Set();

const splitTokens = (value) => value
  .split(/\s+/)
  .map((token) => token.trim())
  .filter(Boolean);

const stripQuotes = (value) => value
  .replace(/^['"`]/, '')
  .replace(/['"`]$/, '');

for (const filePath of filesToScan) {
  try {
    const content = await readFile(filePath, 'utf8');

    const classAttrRegex = /\bclass(?:Name)?\s*=\s*(["'`])([^"'`]*?)\1/gs;
    for (const match of content.matchAll(classAttrRegex)) {
      for (const token of splitTokens(match[2])) {
        candidateSet.add(token);
      }
    }

    const setAttrRegex = /setAttribute\(\s*['"]class['"]\s*,\s*(["'`])([^"'`]*?)\1\s*\)/gs;
    for (const match of content.matchAll(setAttrRegex)) {
      for (const token of splitTokens(match[2])) {
        candidateSet.add(token);
      }
    }

    const classListRegex = /classList\.(?:add|remove|toggle|replace)\(([^)]*)\)/g;
    for (const match of content.matchAll(classListRegex)) {
      const args = match[1]
        .split(',')
        .map((arg) => stripQuotes(arg.trim()))
        .filter((arg) => arg && !arg.includes('${'));

      if (match[0].includes('replace') && args.length >= 2) {
        candidateSet.add(args[0]);
        candidateSet.add(args[1]);
      } else {
        for (const arg of args) {
          candidateSet.add(arg);
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

const candidates = Array.from(candidateSet).sort();

const loadModule = async (id, base) => {
  const normalizedBase = base
    ? (base.startsWith('file://') ? fileURLToPath(base) : base)
    : path.dirname(inputPath);
  const resolvedPath = path.resolve(normalizedBase, id);
  const moduleUrl = pathToFileURL(resolvedPath);
  const imported = await import(moduleUrl);

  return {
    path: resolvedPath,
    base: path.dirname(resolvedPath),
    module: imported.default ?? imported,
  };
};

const compiled = await compile(inputCss, {
  from: inputPath,
  loadModule,
});
const builtCss = compiled.build(candidates);

const minifiedCss = builtCss
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();

await writeFile(outputPath, minifiedCss);

