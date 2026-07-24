const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const labOrder = await prisma.labOrder.findFirst();
  console.log('LabOrder ID:', labOrder ? labOrder.id : 'None');

  const invoice = await prisma.invoice.findFirst();
  console.log('Invoice ID:', invoice ? invoice.id : 'None');
}

main().catch(console.error).finally(() => prisma.$disconnect());
