// Bundles the ES modules of src/ into one self-contained HTML page.
// Each module becomes a scoped closure; imports become destructurings.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const ENTRY = "app.js";
const OUTPUT = join(root, "dist", "desmosomen-zugkraft.html");

const IMPORT = /^import\s+(.+?)\s+from\s+"\.\/(.+?)";\s*$/gm;
const EXPORT = /^export\s+(?:class|function|const)\s+(\w+)/gm;

function moduleName(file) {
  return `__${basename(file, ".js")}`;
}

function rewriteImport(_, clause, file) {
  const namespace = clause.match(/^\*\s+as\s+(\w+)$/);
  const target = moduleName(file);
  return namespace ? `const ${namespace[1]} = ${target};` : `const ${clause} = ${target};`;
}

function wrap(file) {
  const code = readFileSync(join(src, file), "utf8");
  const exported = [...code.matchAll(EXPORT)].map((m) => m[1]);
  const body = code.replace(IMPORT, rewriteImport).replace(/^export\s+/gm, "");
  return `const ${moduleName(file)} = (() => {\n${body}\nreturn { ${exported.join(", ")} };\n})();`;
}

function dependencies(file) {
  const code = readFileSync(join(src, file), "utf8");
  return [...code.matchAll(IMPORT)].map((m) => m[2]);
}

function inDependencyOrder(file, seen = new Set(), order = []) {
  if (seen.has(file)) return order;
  seen.add(file);
  dependencies(file).forEach((dep) => inDependencyOrder(dep, seen, order));
  order.push(file);
  return order;
}

const script = inDependencyOrder(ENTRY).map(wrap).join("\n\n");
const page = readFileSync(join(src, "index.html"), "utf8").replace("/* APP_SCRIPT */", () => script);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, page);
console.log(`wrote ${OUTPUT} (${(page.length / 1024).toFixed(1)} kB)`);
