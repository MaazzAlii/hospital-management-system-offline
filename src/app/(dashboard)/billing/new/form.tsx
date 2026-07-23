"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInvoice } from "@/app/actions/billing";

interface PatientOption {
  id: string;
  name: string;
  mrn: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-colors disabled:opacity-60";
const selectClass = inputClass + " cursor-pointer";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function NewInvoiceForm({ patients, canApplyDiscount = false }: { patients: PatientOption[], canApplyDiscount?: boolean }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [sourceType, setSourceType] = useState("OPD");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt = (subtotal * discountPct) / 100;
  const total = subtotal - discountAmt;

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () =>
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!patientId) errs.patientId = "Please select a patient";
    if (items.some((i) => !i.description.trim()))
      errs.items = "All line items must have a description";
    if (items.some((i) => i.unitPrice <= 0))
      errs.itemsPrice = "All line items must have a price greater than 0";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await createInvoice({
      patientId,
      sourceType,
      items: items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
      discountPct,
      paymentMethod: paymentMethod || undefined,
      notes: notes || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push(`/billing/${result.invoice?.id}`);
    } else {
      setErrorMsg(result.error || "Failed to create invoice");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">New Invoice</h1>
            <p className="text-sm text-muted-foreground">
              Create a new invoice for a patient visit.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient & Type */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Patient & Visit Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient" required error={fieldErrors.patientId}>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className={selectClass}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Visit Type" required>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className={selectClass}
              >
                <option value="OPD">OPD Consultation</option>
                <option value="Lab">Laboratory</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Procedure">Procedure</option>
                <option value="Emergency">Emergency</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Invoice Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          {(fieldErrors.items || fieldErrors.itemsPrice) && (
            <p className="text-xs text-destructive">
              {fieldErrors.items || fieldErrors.itemsPrice}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Description
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground w-20">
                    Qty
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground w-32">
                    Unit Price (Rs.)
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground w-28">
                    Total
                  </th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="e.g. Consultation Fee"
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-medium">
                      Rs. {(item.quantity * item.unitPrice).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1 pt-2 border-t text-sm">
            <div className="flex gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium w-28 text-right">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>
            {canApplyDiscount && (
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">Discount (%)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={inputClass + " w-20 text-right h-8"}
                    value={discountPct}
                    onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                  />
                  {discountPct > 0 && (
                    <span className="text-muted-foreground w-24 text-right">
                      − Rs. {discountAmt.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-8 border-t pt-1.5 mt-1">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg w-28 text-right">
                Rs. {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Payment</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payment Method">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={selectClass}
              >
                <option value="">Unpaid / Pay Later</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
                <option value="easypaisa">EasyPaisa / JazzCash</option>
              </select>
            </Field>
            <Field label="Notes">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Partial payment, instalment…"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/billing">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
