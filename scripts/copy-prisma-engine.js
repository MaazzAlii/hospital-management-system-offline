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

// 1. Ensure .prisma in root node_modules exists and has the latest generated client
if (!fs.existsSync(path.join(rootNodeModules, '.prisma'))) {
  if (fs.existsSync(generatedPrisma)) {
    copyDir(generatedPrisma, path.join(rootNodeModules, '.prisma', 'client'));
    console.log('[copy-prisma-engine] Populated node_modules/.prisma/client from src/generated/prisma');
  }
} else {
  console.log('[copy-prisma-engine] Found node_modules/.prisma');
}

// 2. Dereference all symlinks in .next/node_modules so electron-builder doesn't hit
// Windows EPERM symlink permission errors, and Turbopack external imports resolve seamlessly on any test PC.
function dereferenceSymlinks(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      try {
        const realPath = fs.realpathSync(fullPath);
        fs.unlinkSync(fullPath);
        fs.cpSync(realPath, fullPath, { recursive: true });
        console.log(`[copy-prisma-engine] Dereferenced symlink: ${path.relative(nextNodeModules, fullPath)}`);
      } catch (err) {
        console.warn(`[copy-prisma-engine] Warning dereferencing ${fullPath}:`, err.message);
      }
    } else if (entry.isDirectory()) {
      dereferenceSymlinks(fullPath);
    }
  }
}

if (fs.existsSync(nextNodeModules)) {
  dereferenceSymlinks(nextNodeModules);
  console.log('[copy-prisma-engine] Successfully dereferenced all .next/node_modules symlinks into physical directories.');
}

console.log('[copy-prisma-engine] Done.');
