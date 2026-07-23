export type Gender = "Male" | "Female" | "Other";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  dob: string; // ISO date string YYYY-MM-DD
  gender: Gender;
  phone: string;
  address: string;
  bloodGroup: BloodGroup | null;
  createdAt: string;
}
