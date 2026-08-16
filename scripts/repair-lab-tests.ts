import { prisma } from '../src/lib/prisma'

async function repair() {
  const result = await prisma.labTest.updateMany({
    data: {
      isActive: true,
    },
  });
  console.log(`Successfully repaired ${result.count} lab tests to active state.`);
}

repair()
  .catch((err) => {
    console.error('Error repairing lab tests:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
