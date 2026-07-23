import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  try {
    const roles = await p.role.findMany()
    console.log('Successfully connected to DB! Found roles:', roles)
  } catch (e) {
    console.error('ERROR CONNECTING TO DB:', e.message)
  } finally {
    await p.$disconnect()
  }
}

main()
