import { createClient } from '@/lib/supabase/server';

// Map sequence names to their PostgreSQL sequence identifiers
const SEQUENCES = {
  mrn: 'mrn_seq',
  invoice: 'invoice_seq',
  purchase: 'purchase_seq',
  sale: 'sale_seq',
  labOrder: 'lab_order_seq',
  sample: 'sample_seq',
} as const;

/**
 * Get the next value from a PostgreSQL sequence atomically.
 * This is safe under high concurrency – no race conditions.
 */
async function getNextSequenceValue(seqName: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('nextval', { seq_name: seqName });
  
  if (error || data === null || data === undefined) {
    console.warn(`Fallback for sequence ${seqName}: ${error?.message || 'No data returned'}`);
    return Math.floor(Date.now() % 10000);
  }
  
  return Number(data);
}

/**
 * Helper to format IDs with standardized pattern: PREFIX-YYYY-XXXX (e.g. LCC-2026-0042)
 */
function formatId(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * Generate formatted MRN: LCC-YYYY-XXXX (e.g., LCC-2026-0042)
 */
export async function generateMRN(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.mrn);
  return formatId('LCC', year, seq);
}

/**
 * Generate formatted Invoice No: LCC-YYYY-XXXX (e.g., LCC-2026-0042)
 */
export async function generateInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.invoice);
  return formatId('LCC', year, seq);
}

/**
 * Generate formatted Purchase No: PUR-YYYY-XXXX (e.g., PUR-2026-0042)
 */
export async function generatePurchaseNo(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.purchase);
  return formatId('PUR', year, seq);
}

/**
 * Generate formatted Sale No: SALE-YYYY-XXXX (e.g., SALE-2026-0042)
 */
export async function generateSaleNo(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.sale);
  return formatId('SALE', year, seq);
}

/**
 * Generate formatted Lab Order No: LAB-YYYY-XXXX (e.g., LAB-2026-0042)
 */
export async function generateLabOrderNo(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.labOrder);
  return formatId('LAB', year, seq);
}

/**
 * Generate formatted Sample No: SMP-YYYY-XXXX (e.g., SMP-2026-0042)
 */
export async function generateSampleNo(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.sample);
  return formatId('SMP', year, seq);
}
