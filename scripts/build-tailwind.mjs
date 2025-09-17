import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { compile } from "tailwindcss";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const inputPath = path.join(projectRoot, "src", "input.css");
const outputPath = path.join(projectRoot, "dist", "tailwind.min.css");

const css = await readFile(inputPath, "utf8");

const resolveFrom = (request, baseDir) => {
  const normalizedBase = baseDir ?? path.dirname(inputPath);

  if (request === "tailwindcss") {
    return require.resolve("tailwindcss/index.css", { paths: [normalizedBase] });
  }

  if (request.startsWith("tailwindcss/")) {
    return require.resolve(`tailwindcss/${request.slice("tailwindcss/".length)}`, {
      paths: [normalizedBase],
    });
  }

  if (request.startsWith(".") || path.isAbsolute(request)) {
    return path.resolve(normalizedBase, request);
  }

  return require.resolve(request, { paths: [normalizedBase] });
};

const result = await compile(css, {
  base: path.dirname(inputPath),
  from: inputPath,
  loadStylesheet: async (id, base) => {
    const resolved = resolveFrom(id, base);
    return {
      path: resolved,
      base: path.dirname(resolved),
      content: await readFile(resolved, "utf8"),
    };
  },
  loadModule: async (id, base) => {
    const resolved = resolveFrom(id, base);
    const mod = await import(pathToFileURL(resolved));
    return {
      path: resolved,
      base: path.dirname(resolved),
      module: mod.default ?? mod,
    };
  },
});

const candidateSet = new Set();

const addTokens = (raw) => {
  raw
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => candidateSet.add(token));
};

const textFiles = [
  path.join(projectRoot, "index.html"),
  path.join(projectRoot, "js", "main.js"),
  path.join(projectRoot, "js", "utils.js"),
  inputPath,
];

for (const filePath of textFiles) {
  const content = await readFile(filePath, "utf8");

  const classAttrRegex = /class(?:Name)?=["'`]([^"'`]+)["'`]/g;
  for (const match of content.matchAll(classAttrRegex)) {
    addTokens(match[1]);
  }

  const classListRegex = /classList\.(?:add|remove|toggle)\(([^)]+)\)/g;
  for (const match of content.matchAll(classListRegex)) {
    const inner = match[1];
    const tokenRegex = /["'`]([^"'`]+)["'`]/g;
    for (const tokenMatch of inner.matchAll(tokenRegex)) {
      addTokens(tokenMatch[1]);
    }
  }

  const applyRegex = /@apply\s+([^;]+);/g;
  for (const match of content.matchAll(applyRegex)) {
    addTokens(match[1]);
  }
}

[
  "btn-brand",
  "badge-brand",
  "bg-brand-gradient",
  "shadow-elevated",
  "focus-ring-brand",
  "card-surface",
].forEach((token) => candidateSet.add(token));

const candidates = Array.from(candidateSet).sort();
const builtCss = result.build(candidates);
await writeFile(outputPath, builtCss, "utf8");

console.log(`Tailwind CSS written to ${path.relative(projectRoot, outputPath)} with ${candidates.length} candidates.`);
