import { createClient } from "@/lib/supabase/server";
import NewOpdForm from "./form";
export const dynamic = "force-dynamic";

export default async function NewOpdVisitPage() {
  const supabase = await createClient();
  
  const [ { data: patients }, { data: rawDoctors } ] = await Promise.all([
    supabase.from("Patient").select("id, name, mrn").order("name", { ascending: true }),
    supabase.from("Doctor").select("id, userId, specialization").eq("isActive", true).order("createdAt", { ascending: true })
  ]);

  // Fetch users separately
  let doctorUsers: Record<string, string> = {};
  if (rawDoctors && rawDoctors.length > 0) {
    const userIds = rawDoctors.map(d => d.userId).filter(Boolean);
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("User")
        .select("id, name")
        .in("id", userIds);
      
      if (usersData) {
        doctorUsers = usersData.reduce((acc, u) => {
          acc[u.id] = u.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
  }

  const doctorOptions = (rawDoctors || []).map((d: any) => {
    return {
      id: d.id,
      name: doctorUsers[d.userId] || "Unknown",
      specialization: d.specialization || "",
    };
  });

  return <NewOpdForm patients={patients || []} doctors={doctorOptions} />;
}
