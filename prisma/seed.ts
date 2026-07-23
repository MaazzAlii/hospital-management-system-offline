import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Initialize Supabase Admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('[YOUR-SERVICE-ROLE-SECRET-KEY]')) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing or invalid in .env");
  console.error("Please add your actual service_role key to .env to seed test users.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ROLES = [
  "Super Admin",
  "Hospital Admin",
  "Receptionist",
  "Doctor",
  "Lab Technician",
  "Pathologist",
  "Pharmacist",
  "Cashier",
];

const TEST_USERS = [
  {
    email: 'admin@lifecare.com',
    password: 'password123',
    name: 'Admin User',
    roleName: 'Super Admin',
  },
  {
    email: 'reception@lifecare.com',
    password: 'password123',
    name: 'Receptionist User',
    roleName: 'Receptionist',
  },
  {
    email: 'doctor@lifecare.com',
    password: 'password123',
    name: 'Doctor User',
    roleName: 'Doctor',
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Seed Roles
  console.log("Upserting roles...");
  for (const roleName of ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  
  const allRoles = await prisma.role.findMany();
  console.log(`✅ Seeded ${allRoles.length} roles.`);

  // 2. Seed Test Users
  console.log("Creating test users in Supabase Auth & Prisma...");
  
  for (const tUser of TEST_USERS) {
    const role = allRoles.find(r => r.name === tUser.roleName);
    if (!role) throw new Error(`Role ${tUser.roleName} not found`);

    // Check if user already exists in Prisma to avoid duplicate Auth creation
    const existingPrismaUser = await prisma.user.findUnique({
      where: { email: tUser.email }
    });

    if (existingPrismaUser) {
      console.log(`User ${tUser.email} already exists in DB. Skipping.`);
      continue;
    }

    // Create in Supabase Auth (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tUser.email,
      password: tUser.password,
      email_confirm: true,
      user_metadata: {
        name: tUser.name,
      }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`⚠️ User ${tUser.email} already exists in Supabase Auth, fetching ID...`);
        // We could fetch the user ID here, but for simplicity we rely on clean state or error out.
        // Let's list users to find the ID.
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = existingUsers.users.find(u => u.email === tUser.email);
        
        if (existingAuthUser) {
          await prisma.user.create({
            data: {
              id: existingAuthUser.id,
              email: tUser.email,
              name: tUser.name,
              roleId: role.id,
            }
          });
          console.log(`✅ Linked existing Auth user ${tUser.email} to Prisma DB.`);
        }
        continue;
      }
      console.error(`❌ Failed to create auth user ${tUser.email}:`, authError.message);
      continue;
    }

    if (authData.user) {
      // Create in Prisma mapping to the Supabase Auth UUID
      await prisma.user.create({
        data: {
          id: authData.user.id,
          email: tUser.email,
          name: tUser.name,
          roleId: role.id,
        }
      });
      console.log(`✅ Created user ${tUser.email} (${tUser.roleName})`);
    }
  }

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
