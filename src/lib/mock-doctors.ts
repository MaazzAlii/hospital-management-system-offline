import { Doctor } from "@/types/doctor";

export const mockDoctors: Doctor[] = [
  {
    id: "d-001",
    name: "Dr. Ahmed Khan",
    email: "ahmed.khan@lifecare.com",
    specialization: "General Physician",
    qualifications: ["MBBS", "FCPS (Medicine)"],
    fee: 1000,
    isActive: true,
    createdAt: "2025-10-01",
  },
  {
    id: "d-002",
    name: "Dr. Ayesha Tariq",
    email: "ayesha.tariq@lifecare.com",
    specialization: "Gynecologist",
    qualifications: ["MBBS", "FCPS (Gynecology)"],
    fee: 1500,
    isActive: true,
    createdAt: "2025-10-15",
  },
  {
    id: "d-003",
    name: "Dr. Bilal Shah",
    email: "bilal.shah@lifecare.com",
    specialization: "Pediatrician",
    qualifications: ["MBBS", "MCPS (Pediatrics)"],
    fee: 1200,
    isActive: true,
    createdAt: "2025-11-02",
  },
  {
    id: "d-004",
    name: "Dr. Sana Mehmood",
    email: "sana.mehmood@lifecare.com",
    specialization: "Dermatologist",
    qualifications: ["MBBS", "Dip. Derm"],
    fee: 1500,
    isActive: false,
    createdAt: "2026-01-10",
  },
  {
    id: "d-005",
    name: "Dr. Usman Ali",
    email: "usman.ali@lifecare.com",
    specialization: "Cardiologist",
    qualifications: ["MBBS", "FCPS (Cardiology)", "MRCP"],
    fee: 2500,
    isActive: true,
    createdAt: "2026-02-20",
  },
  {
    id: "d-006",
    name: "Dr. Zainab Noor",
    email: "zainab.noor@lifecare.com",
    specialization: "Orthopedic Surgeon",
    qualifications: ["MBBS", "MS (Orthopedics)"],
    fee: 2000,
    isActive: true,
    createdAt: "2026-03-05",
  },
];

export function getDoctorById(id: string): Doctor | undefined {
  return mockDoctors.find((d) => d.id === id);
}
