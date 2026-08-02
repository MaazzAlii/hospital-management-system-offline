"use server";

import { compare, hash } from "bcrypt";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function login(prevState: any, formData?: FormData) {
  // Support both (formData) and (prevState, formData) signatures
  let email = "";
  let password = "";

  if (formData instanceof FormData) {
    email = (formData.get("email") as string) || "";
    password = (formData.get("password") as string) || "";
  } else if (prevState instanceof FormData) {
    email = (prevState.get("email") as string) || "";
    password = (prevState.get("password") as string) || "";
  } else if (typeof prevState === "object" && prevState !== null) {
    email = prevState.email || "";
    password = prevState.password || "";
  }

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
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

    if (!user || !user.passwordHash) {
      return { error: "Invalid email or password." };
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: "Invalid email or password." };
    }

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = user.role?.name || "User";
    session.permissions = user.role?.rolePermissions.map(
      (rp) => `${rp.permission.module}:${rp.permission.action}`
    ) || [];
    session.isLoggedIn = true;
    await session.save();
  } catch (error: any) {
    console.error("Login error:", error);
    return { error: "An unexpected error occurred during login." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  try {
    const session = await getSession();
    session.destroy();
  } catch (err: unknown) {
    console.error("Exception during logout:", err);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return null;
  }

  // Fetch fresh user data from database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  });

  return {
    id: session.userId,
    email: dbUser?.email || session.email,
    name: dbUser?.name || session.name,
    role: dbUser?.role?.name || session.role,
    permissions: session.permissions,
  };
}

export async function updateProfile(data: {
  name: string;
  email: string;
  password?: string;
}) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = {
      name: data.name,
      email: data.email.trim().toLowerCase(),
    };

    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = await hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    session.name = updatedUser.name;
    session.email = updatedUser.email;
    await session.save();

    revalidatePath("/", "layout");
    return { success: true, user: updatedUser };
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || "Failed to update profile",
    };
  }
}
