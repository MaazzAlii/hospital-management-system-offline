"use client";

import React, { useState, useEffect, useId } from "react";
import { CheckCircle2, AlertCircle, Phone } from "lucide-react";

export interface PhoneNumberInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  error?: string;
  showHelperText?: boolean;
}

/**
 * Extracts raw 10-digit national number from various formats:
 * "+923001234567" -> "3001234567"
 * "0300-1234567"  -> "3001234567"
 * "300 1234567"   -> "3001234567"
 */
export function sanitizePakistaniPhoneNumber(input: string | null | undefined): string {
  if (!input) return "";
  let digits = input.replace(/\D/g, "");
  // If starts with 92 (country code), remove 92
  if (digits.startsWith("92") && digits.length > 10) {
    digits = digits.slice(2);
  }
  // If starts with 0 (e.g. 0300), remove leading 0
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  // Keep max 10 digits
  return digits.slice(0, 10);
}

/**
 * Formats a 10-digit national number into "3XX-XXXXXXX"
 */
export function formatPakistaniDisplay(digits: string): string {
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}`;
}

/**
 * Formats for database or standard storage "+92 3XX XXXXXXX" or "+923XXXXXXXXX"
 */
export function formatFullPakistaniPhone(digits: string): string {
  if (!digits) return "";
  const sanitized = sanitizePakistaniPhoneNumber(digits);
  if (!sanitized) return "";
  return `+92${sanitized}`;
}

export function isValidPakistaniMobile(digits: string): boolean {
  // Must be exactly 10 digits and start with 3 (30X - 37X series)
  return /^3\d{9}$/.test(digits);
}

export const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      value = "",
      onChange,
      onValidationChange,
      placeholder = "300-1234567",
      disabled = false,
      required = false,
      id,
      name,
      className = "",
      error,
      showHelperText = true,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const [rawDigits, setRawDigits] = useState<string>(() => sanitizePakistaniPhoneNumber(value));
    const [touched, setTouched] = useState<boolean>(false);

    // Sync if external value changes
    useEffect(() => {
      const sanitized = sanitizePakistaniPhoneNumber(value);
      if (sanitized !== rawDigits) {
        setRawDigits(sanitized);
      }
    }, [value]);

    const isValid = isValidPakistaniMobile(rawDigits);
    const isComplete = rawDigits.length === 10;
    const isInvalid = touched && rawDigits.length > 0 && !isValid;
    const isRequiredEmpty = touched && required && rawDigits.length === 0;

    useEffect(() => {
      onValidationChange?.(isValid);
    }, [isValid, onValidationChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value;
      const sanitized = sanitizePakistaniPhoneNumber(inputVal);
      setRawDigits(sanitized);

      // Return standardized full format "+923XXXXXXXXX" or "03XXXXXXXXX"
      const outputValue = sanitized ? `+92${sanitized}` : "";
      onChange?.(outputValue);
    };

    const handleBlur = () => {
      setTouched(true);
    };

    const displayFormatted = formatPakistaniDisplay(rawDigits);

    // Border & Glow styling
    let statusClass = "border-input focus-within:ring-2 focus-within:ring-ring focus-within:border-primary";
    if (error || isInvalid || isRequiredEmpty) {
      statusClass = "border-destructive/80 focus-within:ring-2 focus-within:ring-destructive/30 bg-destructive/5";
    } else if (isValid) {
      statusClass = "border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/30 bg-emerald-500/5";
    }

    return (
      <div className={`flex flex-col gap-1 w-full ${className}`}>
        <div
          className={`flex items-center rounded-lg border bg-background overflow-hidden transition-all shadow-sm ${statusClass} ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {/* Non-editable Fixed +92 Pakistan Badge */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground/80 border-r border-input/60 select-none shrink-0">
            <span className="text-xs">🇵🇰</span>
            <span>+92</span>
          </div>

          {/* Formatted Digit Input */}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="tel"
            disabled={disabled}
            required={required}
            value={displayFormatted}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            maxLength={11} // 10 digits + 1 hyphen
            className="w-full bg-transparent px-3 py-2 text-sm font-medium tracking-wide outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
          />

          {/* Right Status Feedback Indicator */}
          <div className="pr-3 flex items-center justify-center shrink-0">
            {isValid ? (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-90 duration-200" title="Valid Pakistani mobile number">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            ) : isInvalid ? (
              <div className="flex items-center gap-1 text-destructive animate-in fade-in duration-200" title="Incomplete or invalid number">
                <AlertCircle className="h-4 w-4" />
              </div>
            ) : rawDigits.length > 0 ? (
              <span className="text-[11px] font-mono font-medium text-muted-foreground/70">
                {rawDigits.length}/10
              </span>
            ) : null}
          </div>
        </div>

        {/* Inline Helper / Error Feedback */}
        {showHelperText && (
          <div className="flex items-center justify-between text-[11px] px-0.5">
            {error || isInvalid ? (
              <span className="text-destructive font-medium">
                {error || (rawDigits.length < 10 ? `Enter 10 digits after +92 (${10 - rawDigits.length} more digits needed)` : "Must start with 3 (e.g. 300-1234567)")}
              </span>
            ) : isRequiredEmpty ? (
              <span className="text-destructive font-medium">Phone number is required</span>
            ) : isValid ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Valid Pakistani mobile number</span>
            ) : (
              <span className="text-muted-foreground/70">Enter 10-digit mobile number (e.g. 300-1234567)</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

PhoneNumberInput.displayName = "PhoneNumberInput";
