import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('[YOUR-SERVICE')) {
  console.error("❌ Missing or invalid SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  { email: "admin@lifecare.com", password: "password123", role: "Super Admin", name: "System Admin" },
  { email: "reception@lifecare.com", password: "password123", role: "Receptionist", name: "Front Desk" },
  { email: "doctor@lifecare.com", password: "password123", role: "Doctor", name: "Dr. Smith" },
];

async function main() {
  console.log("🚀 Starting test user creation...");

  for (const user of testUsers) {
    console.log(`\nProcessing ${user.email}...`);
    
    // 1. Create or get Role
    let dbRole = await prisma.role.findUnique({ where: { name: user.role } });
    if (!dbRole) {
      dbRole = await prisma.role.create({ data: { name: user.role } });
      console.log(`✅ Created missing role: ${user.role}`);
    }

    // 2. Create Supabase Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        console.log(`⚠️  Auth user ${user.email} already exists in Supabase.`);
      } else {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message);
        continue;
      }
    } else {
      console.log(`✅ Created Supabase Auth user: ${user.email} (ID: ${authData.user.id})`);
    }

    // Note: If the user already exists, we might need to get their ID to link them.
    // For simplicity, we can fetch the user ID or just let Prisma use UUID for its own table
    // and rely on email matching, but best practice is to store the Auth UUID as the Prisma User ID.
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = existingUsers.users.find((u) => u.email === user.email);
    
    if (!authUser) {
      console.error(`❌ Could not find auth user for ${user.email}`);
      continue;
    }

    // 3. Create or update Prisma User (using Auth UUID as Prisma ID)
    const dbUser = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: user.email,
        name: user.name,
        roleId: dbRole.id,
      },
      create: {
        id: authUser.id,
        email: user.email,
        name: user.name,
        roleId: dbRole.id,
      },
    });
    
    console.log(`✅ Upserted Prisma User: ${dbUser.email} (ID: ${dbUser.id}, Role: ${user.role})`);
    
    // 4. Create Doctor profile if it's the Doctor
    if (user.role === "Doctor") {
      await prisma.doctor.upsert({
        where: { userId: dbUser.id },
        update: {},
        create: {
          userId: dbUser.id,
          specialization: "General Practice",
          fee: 500.00,
        },
      });
      console.log(`✅ Created Doctor profile for ${dbUser.name}`);
    }
  }

  console.log("\n🎉 All test users processed successfully!");
}

main()
  .catch((e) => {
    console.error("Unhandled error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
