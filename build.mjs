// Bundles the ES modules of src/ into one self-contained HTML page.
// Each module becomes a scoped closure; imports become destructurings.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const ENTRY = "app.js";
const OUTPUT = join(root, "dist", "mikrotubuli-instabilitaet.html");
const STANDALONE_DIR = join(root, "dist", "ilias");
const STANDALONE_ZIP = join(root, "dist", "mikrotubuli-instabilitaet-ilias.zip");

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

// Standalone variant (e.g. an ILIAS HTML learning module): the Artifact host
// adds the document skeleton itself, a plain web server does not.
const standalone = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${page}
</html>
`;
mkdirSync(STANDALONE_DIR, { recursive: true });
writeFileSync(join(STANDALONE_DIR, "index.html"), standalone);
rmSync(STANDALONE_ZIP, { force: true });
execFileSync("zip", ["-q", "-j", STANDALONE_ZIP, join(STANDALONE_DIR, "index.html")]);
console.log(`wrote ${STANDALONE_ZIP}`);
