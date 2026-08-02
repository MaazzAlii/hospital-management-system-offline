import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserRole(): Promise<{ user: any; role: string | null; roleData: any | null }> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return { user: null, role: null, roleData: null };
  }

  // Fetch the User record and its associated Role via Prisma
  const userData = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!userData || !userData.role) {
    return { user: null, role: null, roleData: null };
  }

  return {
    user: { id: userData.id, email: userData.email, name: userData.name },
    role: userData.role.name,
    roleData: userData.role,
  };
}

export { hasAccess } from './permissions';

/**
 * Returns the doctor ID associated with the currently logged-in user,
 * or null if the user is not a doctor or has no doctor profile.
 */
export async function getCurrentDoctorId(): Promise<string | null> {
  const { user, role } = await getCurrentUserRole();
  if (!user || !role || role.toLowerCase() !== 'doctor') return null;

  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return doctor ? doctor.id : null;
}
