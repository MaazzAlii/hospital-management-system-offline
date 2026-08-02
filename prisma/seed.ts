import { hashSync } from 'bcrypt';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Seeding SQLite database via Prisma...");

  // 1. Define Roles
  const roleNames = ['Admin', 'Doctor', 'Receptionist', 'Cashier', 'LabTechnician', 'Pharmacist'];
  const rolesMap: Record<string, any> = {};

  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name} role for Life Care HMS`,
      },
    });
    rolesMap[name] = role;
  }

  // 2. Define Permissions
  const modules = ['dashboard', 'patients', 'doctors', 'appointments', 'opd', 'pharmacy', 'lab', 'billing', 'settings'];
  const actions = ['read', 'write', 'delete', 'apply_discount', 'verify_lab'];

  const permissionsMap: Record<string, any> = {};

  for (const module of modules) {
    for (const action of actions) {
      const permKey = `${module}:${action}`;
      const perm = await prisma.permission.upsert({
        where: { id: permKey },
        update: {},
        create: {
          id: permKey,
          module,
          action,
          description: `Permission to ${action} ${module}`,
        },
      });
      permissionsMap[permKey] = perm;
    }
  }

  // 3. Connect Admin Role to ALL Permissions
  for (const permKey of Object.keys(permissionsMap)) {
    const perm = permissionsMap[permKey];
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolesMap['Admin'].id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: rolesMap['Admin'].id,
        permissionId: perm.id,
      },
    });
  }

  // 4. Create Users
  const defaultPasswordHash = hashSync('password123', 10);
  const adminPasswordHash = hashSync('Admin@123', 10);

  const usersToSeed = [
    {
      email: 'admin@lcc.com',
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      roleName: 'Admin',
    },
    {
      email: 'admin@lifecare.com',
      name: 'Clinic Admin',
      passwordHash: defaultPasswordHash,
      roleName: 'Admin',
    },
    {
      email: 'reception@lifecare.com',
      name: 'Front Desk Reception',
      passwordHash: defaultPasswordHash,
      roleName: 'Receptionist',
    },
    {
      email: 'doctor@lifecare.com',
      name: 'Dr. Sarah Khan',
      passwordHash: defaultPasswordHash,
      roleName: 'Doctor',
    },
    {
      email: 'cashier@lifecare.com',
      name: 'Main Cashier',
      passwordHash: defaultPasswordHash,
      roleName: 'Cashier',
    },
    {
      email: 'pharmacist@lifecare.com',
      name: 'Head Pharmacist',
      passwordHash: defaultPasswordHash,
      roleName: 'Pharmacist',
    },
    {
      email: 'lab@lifecare.com',
      name: 'Lab Tech',
      passwordHash: defaultPasswordHash,
      roleName: 'LabTechnician',
    },
  ];

  for (const u of usersToSeed) {
    const role = rolesMap[u.roleName];
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash: u.passwordHash,
        roleId: role.id,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        roleId: role.id,
      },
    });

    // If Dr. Sarah Khan, ensure Doctor record exists
    if (u.email === 'doctor@lifecare.com') {
      await prisma.doctor.upsert({
        where: { userId: user.id },
        update: {
          specialization: 'General Medicine',
          qualification: 'MBBS, FCPS',
          fee: 1500,
          status: 'active',
        },
        create: {
          userId: user.id,
          specialization: 'General Medicine',
          qualification: 'MBBS, FCPS',
          fee: 1500,
          status: 'active',
        },
      });
    }
  }

  console.log("Database seeded successfully with roles, permissions, and initial accounts!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
