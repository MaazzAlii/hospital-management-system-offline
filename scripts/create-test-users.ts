import { createClient } from "@supabase/supabase-js";
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
    let { data: dbRole } = await supabaseAdmin.from("Role").select("*").eq("name", user.role).maybeSingle();
    if (!dbRole) {
      const { data: newRole } = await supabaseAdmin.from("Role").insert({ name: user.role }).select().single();
      dbRole = newRole;
      console.log(`✅ Created missing role: ${user.role}`);
    }

    // 2. Create Supabase Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
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

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = existingUsers.users.find((u) => u.email === user.email);
    
    if (!authUser) {
      console.error(`❌ Could not find auth user for ${user.email}`);
      continue;
    }

    // 3. Upsert User record in DB
    const { data: dbUser, error: userError } = await supabaseAdmin.from("User").upsert({
      id: authUser.id,
      email: user.email,
      name: user.name,
      roleId: dbRole.id,
      isActive: true,
    }).select().single();
    
    if (userError) {
      console.error(`❌ Error upserting User row: ${userError.message}`);
      continue;
    }

    console.log(`✅ Upserted DB User: ${dbUser.email} (ID: ${dbUser.id}, Role: ${user.role})`);
    
    // 4. Create Doctor profile if Doctor role
    if (user.role === "Doctor") {
      const { data: existingDoctor } = await supabaseAdmin.from("Doctor").select("*").eq("userId", dbUser.id).maybeSingle();
      if (!existingDoctor) {
        await supabaseAdmin.from("Doctor").insert({
          userId: dbUser.id,
          specialization: "General Practice",
          fee: 500.00,
          isActive: true,
        });
        console.log(`✅ Created Doctor profile for ${dbUser.name}`);
      }
    }
  }

  console.log("\n🎉 All test users processed successfully!");
}

main().catch((e) => {
  console.error("Unhandled error:", e);
});
