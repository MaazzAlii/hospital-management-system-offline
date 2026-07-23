import { Patient } from "./patient";
import { Doctor } from "./doctor";

export type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled" | "No-Show";

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient; // Joined
  doctorId: string;
  doctor?: Doctor;   // Joined
  dateTime: string;  // ISO string e.g., "2026-07-20T10:15:00"
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
}
