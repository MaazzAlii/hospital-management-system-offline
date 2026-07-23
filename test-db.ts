import { prisma } from './src/lib/prisma'

async function main() {
  try {
    const roles = await prisma.role.findMany()
    console.log('Successfully connected to DB! Found roles:', roles)
  } catch (error: unknown) {
    console.error('ERROR CONNECTING TO DB:', (error instanceof Error ? error.message : String(error)))
  } finally {
    await prisma.$disconnect()
  }
}

main()
