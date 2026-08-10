import { prisma } from './prisma';
import { Prisma } from '@/generated/prisma';

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
 * If a transaction client 'tx' is passed, it reuses that transaction instead of starting a new nested transaction.
 */
export async function getNextSequenceValue(name: string, tx?: Prisma.TransactionClient): Promise<number> {
  try {
    if (tx) {
      const counter = await tx.counter.upsert({
        where: { name },
        create: { name, value: 1 },
        update: { value: { increment: 1 } },
      });
      return counter.value;
    }

    const result = await prisma.$transaction(async (t) => {
      const counter = await t.counter.upsert({
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
 */
export async function generateSequentialId(
  modelName: string,
  prefix: string,
  padding: number = 4,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(modelName, tx);
  return `${prefix}-${year}-${String(seq).padStart(padding, '0')}`;
}

/**
 * Helper to format IDs with standardized pattern: PREFIX-YYYY-XXXX (e.g. LCC-2026-0042)
 */
function formatId(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export async function generateMRN(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.mrn, tx);
  return formatId('LCC', year, seq);
}

export async function generateInvoiceNo(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.invoice, tx);
  return formatId('LCC', year, seq);
}

export async function generatePurchaseNo(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.purchase, tx);
  return formatId('PUR', year, seq);
}

export async function generateSaleNo(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.sale, tx);
  return formatId('SALE', year, seq);
}

export async function generateLabOrderNo(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.labOrder, tx);
  return formatId('LAB', year, seq);
}

export async function generateSampleNo(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequenceValue(SEQUENCES.sample, tx);
  return formatId('SMP', year, seq);
}
