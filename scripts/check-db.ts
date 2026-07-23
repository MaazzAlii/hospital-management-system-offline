import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:", users.length);
  if (users.length > 0) {
    console.log(users.map(u => u.email).join(', '));
  }
}
main().finally(() => prisma.$disconnect());
