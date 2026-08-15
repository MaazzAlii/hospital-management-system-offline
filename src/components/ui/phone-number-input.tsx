"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
import { CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

export interface CountryOption {
  code: string; // e.g. "+92"
  iso: string; // e.g. "PK"
  name: string; // e.g. "Pakistan"
  flag: string; // e.g. "🇵🇰"
  digits: number; // e.g. 10
  formatDisplay: (raw: string) => string;
  validate: (raw: string) => boolean;
  placeholder: string;
}

export const COUNTRIES: CountryOption[] = [
  {
    code: "+92",
    iso: "PK",
    name: "Pakistan",
    flag: "🇵🇰",
    digits: 10,
    placeholder: "300-1234567",
    formatDisplay: (d) => (d.length <= 3 ? d : `${d.slice(0, 3)}-${d.slice(3, 10)}`),
    validate: (d) => /^3\d{9}$/.test(d),
  },
  {
    code: "+966",
    iso: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    digits: 9,
    placeholder: "50-123-4567",
    formatDisplay: (d) =>
      d.length <= 2 ? d : d.length <= 5 ? `${d.slice(0, 2)}-${d.slice(2)}` : `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5, 9)}`,
    validate: (d) => /^5\d{8}$/.test(d),
  },
  {
    code: "+971",
    iso: "AE",
    name: "UAE",
    flag: "🇦🇪",
    digits: 9,
    placeholder: "50-123-4567",
    formatDisplay: (d) =>
      d.length <= 2 ? d : d.length <= 5 ? `${d.slice(0, 2)}-${d.slice(2)}` : `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5, 9)}`,
    validate: (d) => /^5\d{8}$/.test(d),
  },
  {
    code: "+44",
    iso: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    digits: 10,
    placeholder: "7911-123456",
    formatDisplay: (d) => (d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4, 10)}`),
    validate: (d) => d.length >= 10,
  },
  {
    code: "+1",
    iso: "US",
    name: "USA / Canada",
    flag: "🇺🇸",
    digits: 10,
    placeholder: "202-555-0123",
    formatDisplay: (d) =>
      d.length <= 3 ? d : d.length <= 6 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`,
    validate: (d) => d.length === 10,
  },
  {
    code: "+91",
    iso: "IN",
    name: "India",
    flag: "🇮🇳",
    digits: 10,
    placeholder: "98765-43210",
    formatDisplay: (d) => (d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5, 10)}`),
    validate: (d) => d.length === 10,
  },
  {
    code: "+93",
    iso: "AF",
    name: "Afghanistan",
    flag: "🇦🇫",
    digits: 9,
    placeholder: "70-123-4567",
    formatDisplay: (d) => (d.length <= 2 ? d : `${d.slice(0, 2)}-${d.slice(2, 9)}`),
    validate: (d) => d.length === 9,
  },
  {
    code: "+968",
    iso: "OM",
    name: "Oman",
    flag: "🇴🇲",
    digits: 8,
    placeholder: "9123-4567",
    formatDisplay: (d) => (d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4, 8)}`),
    validate: (d) => d.length === 8,
  },
  {
    code: "+974",
    iso: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    digits: 8,
    placeholder: "3312-3456",
    formatDisplay: (d) => (d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4, 8)}`),
    validate: (d) => d.length === 8,
  },
  {
    code: "+965",
    iso: "KW",
    name: "Kuwait",
    flag: "🇰🇼",
    digits: 8,
    placeholder: "9123-4567",
    formatDisplay: (d) => (d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4, 8)}`),
    validate: (d) => d.length === 8,
  },
  {
    code: "+973",
    iso: "BH",
    name: "Bahrain",
    flag: "🇧🇭",
    digits: 8,
    placeholder: "3612-3456",
    formatDisplay: (d) => (d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4, 8)}`),
    validate: (d) => d.length === 8,
  },
  {
    code: "+",
    iso: "INTL",
    name: "Other (International)",
    flag: "🌐",
    digits: 15,
    placeholder: "Enter phone number",
    formatDisplay: (d) => d,
    validate: (d) => d.length >= 7,
  },
];

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
 * Parses initial string into country and raw local digits
 */
export function parsePhoneValue(value: string | null | undefined): { countryCode: string; rawDigits: string } {
  if (!value) return { countryCode: "+92", rawDigits: "" };

  const trimmed = value.trim();
  // Find matching country code prefix
  for (const c of COUNTRIES) {
    if (c.code !== "+" && trimmed.startsWith(c.code)) {
      const remaining = trimmed.slice(c.code.length).replace(/\D/g, "");
      return { countryCode: c.code, rawDigits: remaining.slice(0, c.digits) };
    }
  }

  // Check if starts with 0 or plain digits (assume Pakistan)
  const allDigits = trimmed.replace(/\D/g, "");
  if (allDigits.startsWith("92") && allDigits.length > 10) {
    return { countryCode: "+92", rawDigits: allDigits.slice(2, 12) };
  }
  if (allDigits.startsWith("0")) {
    return { countryCode: "+92", rawDigits: allDigits.slice(1, 11) };
  }
  if (allDigits.length > 0) {
    return { countryCode: "+92", rawDigits: allDigits.slice(0, 10) };
  }

  return { countryCode: "+92", rawDigits: "" };
}

export const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      value = "",
      onChange,
      onValidationChange,
      placeholder,
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

    const parsed = useMemo(() => parsePhoneValue(value), [value]);

    const [selectedCountryCode, setSelectedCountryCode] = useState<string>(parsed.countryCode);
    const [rawDigits, setRawDigits] = useState<string>(parsed.rawDigits);
    const [touched, setTouched] = useState<boolean>(false);

    const activeCountry = useMemo(
      () => COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0],
      [selectedCountryCode]
    );

    // Keep internal state in sync with external value without triggering loops
    useEffect(() => {
      const nextParsed = parsePhoneValue(value);
      if (nextParsed.countryCode !== selectedCountryCode || nextParsed.rawDigits !== rawDigits) {
        setSelectedCountryCode(nextParsed.countryCode);
        setRawDigits(nextParsed.rawDigits);
      }
    }, [value]);

    const isValid = useMemo(() => {
      if (!rawDigits) return false;
      return activeCountry.validate(rawDigits);
    }, [rawDigits, activeCountry]);

    const isInvalid = touched && rawDigits.length > 0 && !isValid;
    const isRequiredEmpty = touched && required && rawDigits.length === 0;

    useEffect(() => {
      onValidationChange?.(isValid);
    }, [isValid, onValidationChange]);

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCode = e.target.value;
      setSelectedCountryCode(newCode);
      const newCountry = COUNTRIES.find((c) => c.code === newCode) || COUNTRIES[0];

      // Trim raw digits if exceeds new country max
      const trimmedDigits = rawDigits.slice(0, newCountry.digits);
      setRawDigits(trimmedDigits);

      if (trimmedDigits.length > 0) {
        onChange?.(`${newCode} ${trimmedDigits}`);
      } else {
        onChange?.("");
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputStr = e.target.value;

      // Extract ONLY digits
      let nextDigits = inputStr.replace(/\D/g, "");

      // For Pakistan, auto-strip leading 0 if typed
      if (activeCountry.code === "+92" && nextDigits.startsWith("0")) {
        nextDigits = nextDigits.slice(1);
      }

      // Cap at active country max digits
      nextDigits = nextDigits.slice(0, activeCountry.digits);

      setRawDigits(nextDigits);

      // Emit clean standardized output
      if (nextDigits.length > 0) {
        onChange?.(`${activeCountry.code} ${nextDigits}`);
      } else {
        onChange?.("");
      }
    };

    const handleBlur = () => {
      setTouched(true);
    };

    // Calculate display value purely from raw digits
    const displayValue = activeCountry.formatDisplay(rawDigits);

    // Dynamic styling
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
          {/* Selectable Country Code Dropdown */}
          <div className="relative flex items-center bg-muted/60 border-r border-input/60 select-none shrink-0 transition-colors hover:bg-muted/90">
            <div className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-foreground/80 pointer-events-none">
              <span>{activeCountry.flag}</span>
              <span>{activeCountry.code}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-0.5" />
            </div>
            <select
              value={selectedCountryCode}
              onChange={handleCountryChange}
              disabled={disabled}
              aria-label="Select Country Code"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {COUNTRIES.map((c) => (
                <option key={c.iso} value={c.code}>
                  {c.flag} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Formatted Display Input */}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="tel"
            disabled={disabled}
            required={required}
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder || activeCountry.placeholder}
            maxLength={activeCountry.digits + 4} // digits + formatting separators
            className="w-full bg-transparent px-3 py-2 text-sm font-medium tracking-wide outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
          />

          {/* Status Indicator Feedback */}
          <div className="pr-3 flex items-center justify-center shrink-0">
            {isValid ? (
              <div
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-90 duration-200"
                title={`Valid ${activeCountry.name} phone number`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
            ) : isInvalid ? (
              <div
                className="flex items-center gap-1 text-destructive animate-in fade-in duration-200"
                title="Incomplete or invalid number"
              >
                <AlertCircle className="h-4 w-4" />
              </div>
            ) : rawDigits.length > 0 ? (
              <span className="text-[11px] font-mono font-medium text-muted-foreground/70">
                {rawDigits.length}/{activeCountry.digits}
              </span>
            ) : null}
          </div>
        </div>

        {/* Inline Helper / Error Feedback */}
        {showHelperText && (
          <div className="flex items-center justify-between text-[11px] px-0.5">
            {error || isInvalid ? (
              <span className="text-destructive font-medium">
                {error ||
                  (rawDigits.length < activeCountry.digits
                    ? `Enter ${activeCountry.digits} digits for ${activeCountry.name} (${
                        activeCountry.digits - rawDigits.length
                      } more needed)`
                    : `Invalid format for ${activeCountry.name} (e.g. ${activeCountry.placeholder})`)}
              </span>
            ) : isRequiredEmpty ? (
              <span className="text-destructive font-medium">Phone number is required</span>
            ) : isValid ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Valid {activeCountry.name} number
              </span>
            ) : (
              <span className="text-muted-foreground/70">
                Enter {activeCountry.digits}-digit number (e.g. {activeCountry.placeholder})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

PhoneNumberInput.displayName = "PhoneNumberInput";
