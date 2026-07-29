"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  console.log("logout() server action triggered");
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Supabase signOut error:", error);
    } else {
      console.log("Supabase signOut successful");
    }
  } catch (err: unknown) {
    console.error("Exception during logout:", err);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
