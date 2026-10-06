import type { Param } from "@w6w/types";

/** Shared `Param` fragments. Names and semantics are copied from FareHarbor's OpenAPI document. */

export const companyParam: Param = {
  key: "shortname",
  label: "Company shortname",
  type: "string",
  required: true,
  hint: "The company's FareHarbor shortname (e.g. `bodyglove`), as listed by List Companies. " +
    "It is the key to every company-scoped endpoint.",
};

export const availabilityParam: Param = {
  key: "availabilityPk",
  label: "Availability ID",
  type: "number",
  required: true,
  hint: "The availability's `pk`, from the availability list actions.",
};

export const itemParam: Param = {
  key: "itemPk",
  label: "Item ID",
  type: "number",
  required: true,
  hint: "The bookable product's `pk` (FareHarbor calls a product an `item`).",
};

export const bookingParam: Param = {
  key: "bookingUuid",
  label: "Booking UUID",
  type: "string",
  required: true,
  hint: "The booking's `uuid` (not its numeric `pk`).",
};

export const detailedParam: Param = {
  key: "detailed",
  label: "Detailed",
  type: "boolean",
  hint: "Include the additional detail FareHarbor documents for this resource.",
};

/** Path-segment guard: must be present, and is URL-encoded. */
export function seg(value: string | number | undefined | null, label: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  return encodeURIComponent(v);
}

/** A numeric pk path segment: must be a positive integer. */
export function pk(value: string | number | undefined | null, label: string): string {
  const v = String(value ?? "").trim();
  if (!/^\d+$/.test(v)) throw new Error(`${label} must be a numeric ID`);
  return v;
}

/** Normalise a date or date-time to the `YYYY-MM-DD` the date paths require. */
export function ymd(value: string | undefined | null, label: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec((value ?? "").trim());
  if (!m) throw new Error(`${label} must be a date in YYYY-MM-DD format`);
  return m[1];
}

/** Accept a JSON value or a JSON string for a `json` param. */
export function parseJson<T>(value: unknown, label: string): T {
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * The check-in `checkin_status` field: the strings `auto` / `unchanged`, or a status pk
 * (a number). A numeric string from a form field becomes a number; blank means "not provided"
 * (FareHarbor then defaults to `auto`).
 */
export function checkinStatus(
  value: string | number | undefined | null,
): string | number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  const v = value.trim();
  return /^\d+$/.test(v) ? Number(v) : v;
}
