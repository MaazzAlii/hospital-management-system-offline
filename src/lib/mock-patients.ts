import { Patient } from "@/types/patient";

export const mockPatients: Patient[] = [
  {
    id: "p-001",
    mrn: "LCC-2026-0001",
    name: "Muhammad Ali Khan",
    dob: "1985-03-14",
    gender: "Male",
    phone: "0312-3456789",
    address: "Village Nawagai, Buner, KP",
    bloodGroup: "B+",
    createdAt: "2026-01-10",
  },
  {
    id: "p-002",
    mrn: "LCC-2026-0002",
    name: "Razia Bibi",
    dob: "1992-07-22",
    gender: "Female",
    phone: "0333-9876543",
    address: "Mohalla Sikanderpur, Buner",
    bloodGroup: "A+",
    createdAt: "2026-01-15",
  },
  {
    id: "p-003",
    mrn: "LCC-2026-0003",
    name: "Gul Naz",
    dob: "2001-11-05",
    gender: "Female",
    phone: "0345-1122334",
    address: "Daggar, Buner, KP",
    bloodGroup: "O+",
    createdAt: "2026-02-03",
  },
  {
    id: "p-004",
    mrn: "LCC-2026-0004",
    name: "Arif Hussain",
    dob: "1978-06-30",
    gender: "Male",
    phone: "0321-5544332",
    address: "Chagharzai, Buner",
    bloodGroup: "AB+",
    createdAt: "2026-02-18",
  },
  {
    id: "p-005",
    mrn: "LCC-2026-0005",
    name: "Nadia Gul",
    dob: "1995-09-19",
    gender: "Female",
    phone: "0300-7788990",
    address: "Sultanwas, Buner, KP",
    bloodGroup: "B-",
    createdAt: "2026-03-07",
  },
  {
    id: "p-006",
    mrn: "LCC-2026-0006",
    name: "Salim Rehman",
    dob: "1968-12-01",
    gender: "Male",
    phone: "0346-4433221",
    address: "Pir Baba, Buner",
    bloodGroup: "A-",
    createdAt: "2026-04-02",
  },
  {
    id: "p-007",
    mrn: "LCC-2026-0007",
    name: "Zainab Akhtar",
    dob: "2010-04-08",
    gender: "Female",
    phone: "0313-6655443",
    address: "Kingargali, Buner, KP",
    bloodGroup: "O-",
    createdAt: "2026-05-11",
  },
  {
    id: "p-008",
    mrn: "LCC-2026-0008",
    name: "Hameed Ullah",
    dob: "1958-02-27",
    gender: "Male",
    phone: "0323-2211009",
    address: "Totalai, Buner, KP",
    bloodGroup: "AB-",
    createdAt: "2026-06-14",
  },
];

export function getPatientById(id: string): Patient | undefined {
  return mockPatients.find((p) => p.id === id);
}

export function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function generateMRN(sequence: number): string {
  const year = new Date().getFullYear();
  return `LCC-${year}-${String(sequence).padStart(4, "0")}`;
}
