const fs = require('fs');
const path = require('path');

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

const level1 = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'components.json',
  'prisma.config.ts',
  '.env.example',
  'prisma/schema.prisma'
];

const level2 = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/login/page.tsx',
  'src/app/(dashboard)/layout.tsx',
  'src/app/(dashboard)/template.tsx',
  'src/proxy.ts',
  'electron/main.js'
];

const level3 = [
  'src/lib/prisma.ts',
  'src/lib/session.ts',
  'src/lib/auth-utils.ts',
  'src/lib/permissions.ts',
  'src/lib/error-utils.ts',
  'src/lib/id-generator.ts',
  'src/lib/pdf-utils.ts',
  'src/lib/types/database.ts',
  'src/lib/utils.ts',
  'src/app/actions/auth.ts',
  'src/app/actions/appointment.ts',
  'src/app/actions/billing.ts',
  'src/app/actions/doctor.ts',
  'src/app/actions/earnings.ts',
  'src/app/actions/expiry.ts',
  'src/app/actions/lab-order.ts',
  'src/app/actions/lab-result.ts',
  'src/app/actions/lab-test.ts',
  'src/app/actions/medicine.ts',
  'src/app/actions/notification.ts',
  'src/app/actions/opd.ts',
  'src/app/actions/patient.ts',
  'src/app/actions/purchase.ts',
  'src/app/actions/return.ts',
  'src/app/actions/sale.ts',
  'src/app/actions/supplier.ts',
  'src/app/api/pdf/invoice/[id]/route.tsx',
  'src/app/api/pdf/lab-report/[id]/route.tsx',
  'src/app/api/pdf/purchase/[id]/route.tsx'
];

const uiComponents = [
  'src/app/globals.css',
  'src/components/ui/avatar.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/calendar.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/command.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/input-group.tsx',
  'src/components/ui/label.tsx',
  'src/components/ui/phone-number-input.tsx',
  'src/components/ui/popover.tsx',
  'src/components/ui/scroll-area.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/separator.tsx',
  'src/components/ui/sheet.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/textarea.tsx',
  'src/components/ui/tooltip.tsx',
  'src/components/common/DeleteConfirmButton.tsx',
  'src/components/dashboard/EarningsDashboardSection.tsx',
  'src/components/layout/navbar.tsx',
  'src/components/layout/sidebar.tsx',
  'src/components/layout/NotificationDropdown.tsx',
  'src/components/pdf/InvoicePDF.tsx',
  'src/components/pdf/LabReportPDF.tsx',
  'src/components/pdf/PurchaseInvoicePDF.tsx'
];

function getDashboardPages(dir) {
  let res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      res = res.concat(getDashboardPages(full));
    } else if (ent.isFile() && (ent.name.endsWith('.tsx') || ent.name.endsWith('.ts')) && ent.name !== 'layout.tsx' && ent.name !== 'template.tsx') {
      res.push(normalizePath(path.relative(process.cwd(), full)));
    }
  }
  return res;
}

const dashboardPages = getDashboardPages('src/app/(dashboard)').sort();
const level4 = [...uiComponents, ...dashboardPages.filter(f => !uiComponents.includes(f))];

const level5 = [
  'prisma/seed.ts',
  'supabase-rls-full.sql',
  'supabase-sale-function.sql',
  'supabase-sequences.sql'
];

const scriptFiles = fs.readdirSync('scripts')
  .filter(f => !fs.statSync(path.join('scripts', f)).isDirectory() && f !== 'generate_dump.js')
  .map(f => 'scripts/' + f)
  .sort();

level5.push(...scriptFiles);

const sections = [
  { title: 'LEVEL 1: ROOT CONFIGURATION AND DEPENDENCY FILES', files: level1 },
  { title: 'LEVEL 2: MAIN ENTRY POINT / INITIALIZATION FILES', files: level2 },
  { title: 'LEVEL 3: CORE SERVICES, API HANDLERS, AND BACKEND LOGIC', files: level3 },
  { title: 'LEVEL 4: UI COMPONENTS, SCREENS, AND STYLING', files: level4 },
  { title: 'LEVEL 5: PLATFORM-SPECIFIC CONFIGURATIONS, DATABASE SCRIPTS, AND DEPLOYMENT UTILITIES', files: level5 }
];

let output = '# LifeCare Clinic HMS - Full Project Codebase Dump\n\n';
output += 'This structured document aggregates 100% of raw code, configurations, database definitions, actions, and platform scripts across the entire LifeCare Clinic HMS project for architectural review, deep debugging, and cross-file dependency verification.\n\n';

let fileCount = 0;

for (const section of sections) {
  output += '================================================================================\n';
  output += '# ' + section.title + '\n';
  output += '================================================================================\n\n';

  for (const relPath of section.files) {
    if (!fs.existsSync(relPath)) {
      console.warn('Warning: file not found:', relPath);
      continue;
    }
    const content = fs.readFileSync(relPath, 'utf8');
    output += '--- FILE: ' + relPath + ' ---\n';
    output += content;
    if (!content.endsWith('\n')) {
      output += '\n';
    }
    output += '\n';
    fileCount++;
  }
}

fs.writeFileSync('full_project_dump.md', output, 'utf8');
console.log('Successfully generated full_project_dump.md with ' + fileCount + ' files. Size: ' + (output.length / 1024 / 1024).toFixed(2) + ' MB');
