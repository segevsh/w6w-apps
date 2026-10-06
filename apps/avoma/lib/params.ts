import type { OutputField, Param } from "@w6w/types";

/** Shared `Param` fragments. Every name and bound is copied from Avoma's OpenAPI document. */

export const pageSizeParam = (hint?: string): Param => ({
  key: "pageSize",
  label: "Page size",
  type: "number",
  default: 50,
  validation: { min: 1, max: 100, integer: true },
  hint: hint ?? "Records per page. Avoma's own default is 10 and the documented maximum is 100.",
});

/** The pagination cursor: the `next` URL returned by the previous page. */
export const nextParam: Param = {
  key: "next",
  label: "Next page URL",
  type: "string",
  hint: "Paste the `next` value from the previous page's output to fetch the following page. " +
    "Must be an https://api.avoma.com/v1/ URL.",
};

export const fromDateParam = (required: boolean, noun: string): Param => ({
  key: "fromDate",
  label: "From date",
  type: "datetime",
  hint: `${noun} started at or after this UTC date-time (RFC 3339).${
    required ? " Avoma requires it unless a Next page URL is given." : ""
  } Keep the range narrow: requests time out after 60 seconds on large accounts.`,
});

export const toDateParam = (required: boolean, noun: string): Param => ({
  key: "toDate",
  label: "To date",
  type: "datetime",
  hint: `${noun} started at or before this UTC date-time (RFC 3339).${
    required ? " Avoma requires it unless a Next page URL is given." : ""
  }`,
});

export const pageOutput: OutputField[] = [
  { key: "results", type: "array", label: "Records" },
  { key: "count", type: "number", label: "Total matching records" },
  { key: "next", type: "string", label: "URL of the next page, or null" },
  { key: "previous", type: "string", label: "URL of the previous page, or null" },
];

/** Path-segment guard: a uuid / external id must be present and is URL-encoded. */
export function seg(value: string | undefined, label: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  return encodeURIComponent(v);
}

/**
 * Avoma's `from_date` / `to_date` are REQUIRED on most list endpoints. They are not marked
 * `required` on the form because a follow-up call that carries a Next page URL needs neither.
 */
export function requireRange(
  input: { fromDate?: string; toDate?: string; next?: string },
): void {
  if (input.next) return;
  if (!input.fromDate || !input.toDate) {
    throw new Error("Avoma requires both fromDate and toDate (or a Next page URL)");
  }
}
