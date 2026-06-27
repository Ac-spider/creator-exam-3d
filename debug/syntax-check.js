import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['server.js', 'public/js', 'debug'];
const files = [];

function collect(path) {
  const info = statSync(path);
  if (info.isFile() && extname(path) === '.js') {
    files.push(path);
    return;
  }
  if (!info.isDirectory()) return;
  for (const entry of readdirSync(path)) {
    collect(join(path, entry));
  }
}

for (const root of roots) collect(root);

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}

if (failed > 0) {
  console.error(`Syntax check failed for ${failed} file(s).`);
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JS file(s).`);
