// scripts/copy-prisma-engine.js
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-prisma-engine] Source not found, skipping: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const rootNodeModules = path.join(__dirname, '..', 'node_modules');
const nextNodeModules = path.join(__dirname, '..', '.next', 'node_modules');
const generatedPrisma = path.join(__dirname, '..', 'src', 'generated', 'prisma');

// 1. Ensure .prisma in root node_modules has the latest generated client
if (fs.existsSync(path.join(rootNodeModules, '.prisma'))) {
  console.log('[copy-prisma-engine] Found node_modules/.prisma');
} else {
  console.warn('[copy-prisma-engine] Warning: node_modules/.prisma not found. Ensure "npx prisma generate" has been run.');
}

// 2. Also copy .prisma to .next/node_modules so Next.js server external bundles find it directly
if (fs.existsSync(path.join(rootNodeModules, '.prisma'))) {
  copyDir(
    path.join(rootNodeModules, '.prisma'),
    path.join(nextNodeModules, '.prisma')
  );
  console.log('[copy-prisma-engine] Copied .prisma to .next/node_modules/.prisma');
}

// 3. Copy generated client to .next/node_modules/@prisma/client if needed
if (fs.existsSync(generatedPrisma)) {
  copyDir(
    generatedPrisma,
    path.join(nextNodeModules, '@prisma', 'client')
  );
  console.log('[copy-prisma-engine] Copied src/generated/prisma to .next/node_modules/@prisma/client');
}

console.log('[copy-prisma-engine] Done.');
