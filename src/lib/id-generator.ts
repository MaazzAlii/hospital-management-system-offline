import { prisma } from './prisma';

// Map sequence names to their counter identifiers
const SEQUENCES = {
  mrn: 'mrn_seq',
  invoice: 'invoice_seq',
  purchase: 'purchase_seq',
  sale: 'sale_seq',
  labOrder: 'lab_order_seq',
  sample: 'sample_seq',
} as const;

/**
 * Get the next value from the SQLite Counter table atomically via a Prisma transaction.
 * This is safe under concurrency and prevents ID collision.
 * If the transaction fails, throws an explicit error (no silent fallback).
 */
export async function getNextSequenceValue(name: string): Promise<number> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const counter = await tx.counter.upsert({
        where: { name },
        create: { name, value: 1 },
        update: { value: { increment: 1 } },
      });
      return counter.value;
    });
    return result;
  } catch (error: any) {
    console.error(`[ID Generator] Error incrementing counter '${name}':`, error);
    throw new Error(
      `Failed to generate ID sequence for '${name}' - ${error?.message || error}`
    );
  }
}

/**
 * Helper function to generate formatted sequential IDs using a prefix, current year, and padded sequence.
 * e.g., generateSequentialId('mrn_seq', 'LCC', 4) => "LCC-2026-0001"
 */
export async function generateSequentialId(
  modelName: string,
  prefix: string,
  padding: number = 4
): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(modelName);
  return `${prefix}-${year}-${String(seq).padStart(padding, '0')}`;
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
