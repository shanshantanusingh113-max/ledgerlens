// The only place money, dates and percentages are formatted.
import type { FieldValue, ImpactType } from "./types";

function group(whole: number): string {
  const digits = String(whole);
  const tail = digits.slice(-3);
  let head = digits.slice(0, -3);
  const groups: string[] = [];
  while (head.length > 2) {
    groups.unshift(head.slice(-2));
    head = head.slice(0, -2);
  }
  if (head) groups.unshift(head);
  return [...groups, tail].join(",");
}

/** A whole number in Indian grouping: 281615 is 2,81,615. */
export function indian(value: number): string {
  return group(Math.round(value));
}

/** Rs with Indian grouping: 42000000 paise is Rs 4,20,000. */
export function rupees(paise: number, withPaise = false): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  if (!withPaise) return `${sign}Rs ${group(Math.round(abs / 100))}`;
  return `${sign}Rs ${group(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, "0")}`;
}

/** Headline form: Rs 4.82 L from one lakh up, Rs 1.20 Cr from one crore up. */
export function rupeesShort(paise: number): string {
  const value = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "";
  if (value >= 1e7) return `${sign}Rs ${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${sign}Rs ${(value / 1e5).toFixed(2)} L`;
  return rupees(paise);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function date(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function periodName(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${LONG_MONTHS[m - 1]} ${y}`;
}

export function percent(value: number | null, digits = 0): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(digits)}%`;
}

export const IMPACT_WORDS: Record<ImpactType, string> = {
  itc_at_risk: "ITC at risk",
  itc_found: "ITC found",
  excess_tax: "excess tax",
  short_tax: "short tax",
  unaccounted_payment: "unaccounted",
  open_payable: "open payable",
  none: "",
};

/** A field value for a table cell: money for _paise fields, dates for date fields, percent for rates. */
export function fieldValue(field: string, value: FieldValue): string {
  if (value === null || value === undefined) return "";
  if (field.endsWith("_paise") && typeof value === "number") return rupees(value, true).replace("Rs ", "");
  if ((field === "tax_rate_pct" || field === "rate") && typeof value === "number") return `${value}%`;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return date(value);
  if (typeof value === "string" && /^[A-Z_]+$/.test(value) && value.length > 3) return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
  return String(value);
}

export const TABLE_NAMES: Record<string, string> = {
  invoices: "Invoice",
  ledger_entries: "Ledger",
  bank_transactions: "Bank",
  gstr2b_lines: "GSTR-2B",
  parties: "Party",
  filings: "Filed return",
};
