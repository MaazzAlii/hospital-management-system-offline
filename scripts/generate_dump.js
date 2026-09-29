const fs = require('fs');
const path = require('path');

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function getFilesInDir(dir, exts = null) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      res = res.concat(getFilesInDir(full, exts));
    } else if (ent.isFile()) {
      if (!exts || exts.some(ext => ent.name.endsWith(ext))) {
        res.push(normalizePath(path.relative(process.cwd(), full)));
      }
    }
  }
  return res.sort();
}

// Level 1: Root configuration and dependency files
const level1 = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'components.json',
  'prisma.config.ts',
  '.env.example',
  'prisma/schema.prisma',
  'prisma/migrations/20260802085518_init/migration.sql',
  'prisma/migrations/migration_lock.toml'
].filter(f => fs.existsSync(f));

// Level 2: Main entry point / initialization files
const level2 = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/login/page.tsx',
  'src/app/(dashboard)/layout.tsx',
  'src/app/(dashboard)/template.tsx',
  'src/proxy.ts',
  'electron/main.js'
].filter(f => fs.existsSync(f));

// Level 3: Core services, API handlers, and backend logic
const level3Lib = getFilesInDir('src/lib');
const level3Actions = getFilesInDir('src/app/actions');
const level3Api = getFilesInDir('src/app/api');
const level3 = [...level3Lib, ...level3Actions, ...level3Api].filter((v, i, a) => a.indexOf(v) === i);

// Level 4: UI components, screens, and styling
const level4Css = ['src/app/globals.css'].filter(f => fs.existsSync(f));
const level4Components = getFilesInDir('src/components');
const level4Pages = getFilesInDir('src/app/(dashboard)').filter(f => !level2.includes(f) && !level4Components.includes(f));
const level4 = [...level4Css, ...level4Components, ...level4Pages].filter((v, i, a) => a.indexOf(v) === i);

// Level 5: Platform-specific configurations, database scripts, deployment utilities
const level5Db = [
  'prisma/seed.ts',
  'supabase-rls-full.sql',
  'supabase-sale-function.sql',
  'supabase-sequences.sql'
].filter(f => fs.existsSync(f));

const level5Build = ['build/installer.nsh'].filter(f => fs.existsSync(f));

const level5Scripts = getFilesInDir('scripts')
  .filter(f => !f.endsWith('.png') && !f.endsWith('.jpg') && !f.endsWith('.jpeg'));

const level5 = [...level5Db, ...level5Build, ...level5Scripts].filter((v, i, a) => a.indexOf(v) === i);

const sections = [
  { level: 1, title: 'LEVEL 1: ROOT CONFIGURATION AND DEPENDENCY FILES', files: level1 },
  { level: 2, title: 'LEVEL 2: MAIN ENTRY POINT / INITIALIZATION FILES', files: level2 },
  { level: 3, title: 'LEVEL 3: CORE SERVICES, API HANDLERS, AND BACKEND LOGIC', files: level3 },
  { level: 4, title: 'LEVEL 4: UI COMPONENTS, SCREENS, AND STYLING', files: level4 },
  { level: 5, title: 'LEVEL 5: PLATFORM-SPECIFIC CONFIGURATIONS, DATABASE SCRIPTS, AND DEPLOYMENT UTILITIES', files: level5 }
];

let output = '';
let fileCount = 0;

for (const section of sections) {
  for (const relPath of section.files) {
    if (!fs.existsSync(relPath)) {
      console.warn('Warning: file not found:', relPath);
      continue;
    }
    const content = fs.readFileSync(relPath, 'utf8');
    output += `--- FILE: ${relPath} ---\n`;
    output += content;
    if (!content.endsWith('\n')) {
      output += '\n';
    }
    output += '\n';
    fileCount++;
  }
}

fs.writeFileSync('full_project_dump.md', output, 'utf8');
console.log(`Successfully generated full_project_dump.md with ${fileCount} files. Size: ${(output.length / 1024 / 1024).toFixed(2)} MB`);
