export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  qualifications: string[];
  fee: number;
  isActive: boolean;
  createdAt: string;
}
