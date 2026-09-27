// Build a single self-contained HTML file (dist/wildgene.html) from the modules,
// so the simulator can be opened offline by double-clicking, or shared as one file.
// No dependencies: a tiny bundler that understands the import/export style used here.
//
//   node tools/build.js

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm;
const EXPORT_DECL_RE = /^export\s+(?:async\s+)?(function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;

const modules = new Map(); // path -> { code, deps }
const order = [];

function load(file) {
  if (modules.has(file)) return;
  const src = readFileSync(file, 'utf8');
  const deps = [];
  const imports = [];
  src.replace(IMPORT_RE, (_, names, spec) => {
    const dep = resolve(dirname(file), spec);
    deps.push(dep);
    imports.push({ names, dep });
    return '';
  });
  modules.set(file, { src, deps, imports });
  for (const d of deps) load(d);
  order.push(file); // post-order: dependencies first
}

function transform(file) {
  const { src, imports } = modules.get(file);
  const exported = [];
  let code = src.replace(IMPORT_RE, '');
  code = code.replace(EXPORT_DECL_RE, (m, kind, name) => { exported.push(name); return m.replace(/^export\s+/, ''); });
  if (/^export\s/m.test(code)) throw new Error(`Unsupported export form in ${relative(root, file)}`);
  const header = imports.map(({ names, dep }) => {
    const parts = names.split(',').map((s) => s.trim()).filter(Boolean)
      .map((p) => { const [a, b] = p.split(/\s+as\s+/); return b ? `${a}: ${b}` : a; });
    return `const { ${parts.join(', ')} } = __modules[${JSON.stringify(relative(root, dep))}];`;
  }).join('\n');
  return `__modules[${JSON.stringify(relative(root, file))}] = (() => {\n${header}\n${code}\nreturn { ${exported.join(', ')} };\n})();`;
}

const entry = join(root, 'src/main.js');
load(entry);
const bundle = `const __modules = {};\n${order.map(transform).join('\n\n')}`;

let html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src/ui/styles.css'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="src\/ui\/styles\.css">/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script type="module" src="src\/main\.js"><\/script>/, () => `<script>\n(() => {\n${bundle}\n})();\n</script>`);
if (html.includes('<script type="module"') || html.includes('href="src/')) throw new Error('Build failed to inline assets');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/wildgene.html'), html);
console.log(`Built dist/wildgene.html (${(html.length / 1024).toFixed(0)} KB, ${order.length} modules)`);
