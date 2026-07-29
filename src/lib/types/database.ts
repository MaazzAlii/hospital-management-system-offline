// =============================================================================
// DATABASE TYPES FOR LIFE CARE CLINIC HMS
// =============================================================================

export interface Role {
  id: string;
  name: string;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  branchId?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  role?: Role;
}

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor {
  id: string;
  userId: string;
  specialization?: string | null;
  qualifications?: string | null;
  fee?: number | null;
  isActive: boolean;
  createdAt?: string;
  user?: User;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | string;
  notes?: string | null;
  createdAt?: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface OpdVisit {
  id: string;
  patientId: string;
  doctorId: string;
  visitDate: string;
  vitals?: Record<string, any> | null;
  diagnosis?: string | null;
  notes?: string | null;
  followUpDate?: string | null;
  status: 'open' | 'closed' | string;
  createdAt?: string;
  updatedAt?: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  sourceType: 'OPD' | 'Lab' | 'Pharmacy' | string;
  sourceId: string;
  patientId: string;
  subtotal: number;
  aoDiscountPct: number;
  discountAmt: number;
  total: number;
  status: 'unpaid' | 'paid' | 'partial' | 'completed' | string;
  paymentMethod?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patient?: Patient;
  items?: InvoiceItem[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paidAt?: string;
  note?: string | null;
}

export interface Medicine {
  id: string;
  name: string;
  categoryId?: string | null;
  manufacturer?: string | null;
  inPrice?: number | null;
  outPrice: number;
  unit?: string | null;
  barcode?: string | null;
  reorderLevel?: number | null;  // low-stock threshold; batchNo/expiryDate live on PurchaseItem
  isActive: boolean;
  createdAt?: string;
}

export interface StockMovement {
  id: string;
  medicineId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | string;
  quantity: number;
  referenceId?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  totalAmount: number;
  status: string;
  notes?: string | null;
  createdAt?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  medicineId: string;
  quantity: number;
  outPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  saleNo: string;
  patientId?: string | null;
  totalAmount: number;
  status: string;
  createdAt?: string;
  patient?: Patient;
  items?: SaleItem[];
}

export interface LabOrder {
  id: string;
  orderNo: string;
  patientId: string;
  doctorId?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | string;
  notes?: string | null;
  createdAt?: string;
  Patient?: Patient;
  Doctor?: Doctor;
}

export interface LabResult {
  id: string;
  labOrderItemId: string;
  sampleId?: string | null;
  resultValue: string;
  unit?: string | null;
  flag?: string | null;
  status: 'pending' | 'verified' | string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}
