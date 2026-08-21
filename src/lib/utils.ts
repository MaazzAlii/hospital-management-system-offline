import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Safely formats any date string, Date object, or timestamp to a localized date string.
 * Returns a fallback ("—") if the date is null, undefined, or invalid.
 */
export function formatDisplayDate(
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-PK", options);
}

/**
 * Safely formats any date string, Date object, or timestamp to a localized date & time string.
 * Returns a fallback ("—") if the date is null, undefined, or invalid.
 */
export function formatDisplayDateTime(
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString("en-PK", options);
}
