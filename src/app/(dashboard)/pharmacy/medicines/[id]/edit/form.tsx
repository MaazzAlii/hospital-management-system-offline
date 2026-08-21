"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pill, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMedicine, createCategory } from "@/app/actions/medicine";

interface CategoryOption {
  id: string;
  name: string;
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

export default function EditMedicineForm({
  medicine,
  categories: initialCategories,
}: {
  medicine: any;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);

  const [name, setName] = useState(medicine.name || "");
  const [categoryId, setCategoryId] = useState(medicine.categoryId || "");
  const [manufacturer, setManufacturer] = useState(medicine.manufacturer || "");
  const [inPrice, setInPrice] = useState(medicine.unitPrice ? String(medicine.unitPrice) : "");
  const [outPrice, setOutPrice] = useState(medicine.sellingPrice ? String(medicine.sellingPrice) : "");
  const [unit, setUnit] = useState(medicine.unit || "Tablet");
  const [reorderLevel, setReorderLevel] = useState(medicine.reorderLevel !== undefined && medicine.reorderLevel !== null ? String(medicine.reorderLevel) : "4");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setIsAddingCat(true);
    const res = await createCategory(newCatName.trim());
    setIsAddingCat(false);
    if (res.success && res.category) {
      setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(res.category.id);
      setNewCatName("");
      setShowNewCatInput(false);
    } else {
      setErrorMsg(res.error || "Failed to create category");
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Medicine name is required";
    if (!categoryId) errs.categoryId = "Category is required";
    if (!inPrice || Number(inPrice) <= 0) errs.inPrice = "In price must be greater than 0";
    if (!outPrice || Number(outPrice) <= 0) errs.outPrice = "Out price must be greater than 0";
    if (!unit.trim()) errs.unit = "Unit is required";
    if (!reorderLevel || Number(reorderLevel) < 0) errs.reorderLevel = "Reorder level must be 0 or more";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await updateMedicine(medicine.id, {
      name: name.trim(),
      categoryId,
      manufacturer: manufacturer.trim() || undefined,
      inPrice: Number(inPrice),
      outPrice: Number(outPrice),
      unit: unit.trim(),
      reorderLevel: Number(reorderLevel),
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push("/pharmacy/medicines");
    } else {
      setErrorMsg(result.error || "Failed to update medicine");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/pharmacy/medicines"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Medicines
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Edit Medicine</h1>
            <p className="text-sm text-muted-foreground">
              Update medicine details, prices, and stock reorder levels.
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
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Medicine Name" required error={fieldErrors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Paracetamol 500mg"
                className={inputClass}
              />
            </Field>

            <Field label="Category" required error={fieldErrors.categoryId}>
              <div className="flex gap-2">
                {!showNewCatInput ? (
                  <>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewCatInput(true)}
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex w-full gap-1.5">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="New category name"
                      className={inputClass}
                    />
                    <Button
                      type="button"
                      disabled={isAddingCat}
                      onClick={handleAddCategory}
                    >
                      {isAddingCat ? "Adding…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowNewCatInput(false);
                        setNewCatName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Manufacturer" error={fieldErrors.manufacturer}>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. GlaxoSmithKline"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Pricing & Inventory</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="In Price (Purchase Cost)" required error={fieldErrors.inPrice}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inPrice}
                  onChange={(e) => setInPrice(e.target.value)}
                  className={inputClass + " pl-9"}
                />
              </div>
            </Field>

            <Field label="Out Price (Retail Sale Price)" required error={fieldErrors.outPrice}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={outPrice}
                  onChange={(e) => setOutPrice(e.target.value)}
                  className={inputClass + " pl-9"}
                />
              </div>
            </Field>

            <Field label="Unit" required error={fieldErrors.unit}>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={selectClass}
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup (Bottle)</option>
                <option value="Injection">Injection</option>
                <option value="Ointment">Ointment (Tube)</option>
                <option value="Box">Box</option>
                <option value="Strip">Strip</option>
                <option value="Vial">Vial</option>
              </select>
            </Field>

            <Field label="Reorder Level" required error={fieldErrors.reorderLevel}>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/pharmacy/medicines">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
