import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const appts = await p.appointment.findMany({
    include: { Patient: true, Doctor: true }
  })
  console.log("Prisma Appointments:", appts)
}
main().catch(console.error).finally(() => p.$disconnect())
