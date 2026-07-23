import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Printer } from "lucide-react";
import PrintButton from "./print-button";
export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoiceRaw } = await supabase
    .from("Invoice")
    .select(`
      *,
      Patient (*),
      items:InvoiceItem (*),
      payments:Payment (*)
    `)
    .eq("id", id)
    .single();

  if (!invoiceRaw) notFound();

  const invoice = {
    ...invoiceRaw,
    patient: Array.isArray(invoiceRaw.Patient) ? invoiceRaw.Patient[0] : invoiceRaw.Patient,
  };

  const { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();

  const clinicName = settings?.clinicName ?? "Life Care Clinic Nawagai, Buner";
  const clinicPhone = settings?.phone ?? "0343-9626941";
  const clinicAddress = settings?.address ?? "Nawagai, Buner";

  const subtotal = Number(invoice.subtotal);
  const discountAmt = Number(invoice.discountAmt);
  const total = Number(invoice.total);

  const createdDate = new Date(invoice.createdAt).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const statusColors: Record<string, string> = {
    paid: "bg-success/10 text-success border-success/30",
    unpaid: "bg-destructive/10 text-destructive border-destructive/30",
    partial: "bg-warning/10 text-warning border-warning/30",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>
        <PrintButton invoiceId={invoice.id} />
      </div>

      {/* Printable Invoice */}
      <div
        id="invoice-print"
        className="rounded-xl border bg-card shadow-sm p-8 max-w-3xl mx-auto"
      >
        {/* Clinic header */}
        <div className="flex items-start justify-between border-b pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {clinicName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{clinicAddress}</p>
            <p className="text-sm text-muted-foreground">Ph: {clinicPhone}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-foreground/20 tracking-widest">
              INVOICE
            </div>
            <p className="font-mono text-lg font-semibold text-primary mt-1">
              {invoice.invoiceNo}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{createdDate}</p>
            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold uppercase ${
                statusColors[invoice.status] || "bg-muted text-muted-foreground"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Patient info */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Bill To
          </p>
          <p className="font-semibold text-foreground">{invoice.patient?.name || "Unknown"}</p>
          <p className="text-sm text-muted-foreground font-mono">{invoice.patient?.mrn || "—"}</p>
          {invoice.patient?.phone && (
            <p className="text-sm text-muted-foreground">{invoice.patient.phone}</p>
          )}
          {invoice.patient?.address && (
            <p className="text-sm text-muted-foreground">{invoice.patient.address}</p>
          )}
        </div>

        {/* Visit type */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground">
            Visit Type:{" "}
            <span className="font-medium text-foreground">{invoice.sourceType}</span>
          </p>
        </div>

        {/* Line items table */}
        <div className="rounded-lg border overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item: any, idx: number) => (
                <tr
                  key={item.id}
                  className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                >
                  <td className="px-4 py-3 text-sm">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-center text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    Rs. {Number(item.unitPrice).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    Rs. {Number(item.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">Rs. {subtotal.toLocaleString()}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount ({Number(invoice.aoDiscountPct)}%)</span>
                <span>− Rs. {discountAmt.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-base">
              <span>Total</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
            {invoice.paymentMethod && (
              <div className="flex justify-between text-success text-xs">
                <span>Paid via {invoice.paymentMethod}</span>
                <span>Rs. {total.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment records */}
        {(invoice.payments || []).length > 0 && (
          <div className="mt-8 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Payment Records
            </p>
            <div className="space-y-1.5">
              {invoice.payments.map((pmt: any) => (
                <div
                  key={pmt.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(pmt.paidAt).toLocaleDateString("en-PK")} ·{" "}
                    {pmt.method}
                    {pmt.note && ` · ${pmt.note}`}
                  </span>
                  <span className="font-medium text-success">
                    Rs. {Number(pmt.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground border-t pt-5">
            <span className="font-medium text-foreground">Note: </span>
            {invoice.notes}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          Thank you for choosing {clinicName}. We wish you a speedy recovery.
        </div>
      </div>
    </div>
  );
}
