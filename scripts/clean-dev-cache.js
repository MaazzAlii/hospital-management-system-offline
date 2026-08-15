// scripts/clean-dev-cache.js
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const nextDir = path.join(projectRoot, '.next');

const dirsToPurge = [
  path.join(nextDir, 'dev'),
  path.join(nextDir, 'cache'),
  path.join(nextDir, 'diagnostics'),
  path.join(nextDir, 'types'),
];

console.log('[clean-dev-cache] Purging development compiler caches to minimize installer size...');

for (const dir of dirsToPurge) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[clean-dev-cache] Removed: ${path.relative(projectRoot, dir)}`);
    } catch (err) {
      console.warn(`[clean-dev-cache] Could not remove ${dir}:`, err.message);
    }
  }
}

console.log('[clean-dev-cache] Done cleaning development caches.');
