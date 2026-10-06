import type { Param } from "@w6w/types";
import { compact, jsonValue } from "./client.ts";

export const LANGUAGES = [
  "ar",
  "ca",
  "cs",
  "zh",
  "da",
  "nl",
  "en",
  "fi",
  "fr",
  "de",
  "el",
  "hu",
  "is",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "no",
  "pl",
  "pt",
  "ru",
  "es",
  "sv",
  "ta",
  "th",
  "tr",
  "zh-Hant",
  "iw",
];

/** The flat reservation fields shared by Create (all required ones marked) and Update. */
export interface ReservationFields {
  check_in?: string;
  check_out?: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  accommodation?: number;
  currency?: string;
  cleaning_fee?: number;
  pet_fee?: number;
  other_fees?: unknown;
  notes?: string;
  language?: string;
}

const num = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));

/**
 * Fold the flat form fields into the vendor's nested `guests` / `guest` / `financials` objects.
 * An object is only emitted when at least one of its fields was supplied, so a partial
 * update never sends an empty nested object.
 */
export function reservationBody(input: ReservationFields): Record<string, unknown> {
  const guests = compact({
    adults: num(input.adults),
    children: num(input.children),
    infants: num(input.infants),
    pets: num(input.pets),
  });
  const guest = compact({
    first_name: input.guest_first_name,
    last_name: input.guest_last_name,
    email: input.guest_email,
    phone: input.guest_phone,
  });
  const fees = jsonValue(input.other_fees);
  const financials = compact({
    accommodation: num(input.accommodation),
    currency: input.currency,
    cleaning_fee: num(input.cleaning_fee),
    pet_fee: num(input.pet_fee),
    other_fees: fees,
  });
  return compact({
    check_in: input.check_in,
    check_out: input.check_out,
    guests: Object.keys(guests).length ? guests : undefined,
    guest: Object.keys(guest).length ? guest : undefined,
    financials: Object.keys(financials).length ? financials : undefined,
    notes: input.notes,
    language: input.language,
  });
}

/** Form params for the reservation fields; `required` marks the Create-only mandatory ones. */
export function reservationParams(required: boolean): Param[] {
  const r = required || undefined;
  return [
    { key: "check_in", label: "Check-in date", type: "date", required: r, hint: "YYYY-MM-DD." },
    {
      key: "check_out",
      label: "Check-out date",
      type: "date",
      required: r,
      hint: "YYYY-MM-DD, after check-in.",
    },
    {
      key: "adults",
      label: "Adults",
      type: "number",
      required: r,
      validation: { integer: true, min: 1 },
    },
    { key: "children", label: "Children", type: "number", validation: { integer: true, min: 0 } },
    { key: "infants", label: "Infants", type: "number", validation: { integer: true, min: 0 } },
    { key: "pets", label: "Pets", type: "number", validation: { integer: true, min: 0 } },
    { key: "guest_first_name", label: "Guest first name", type: "string", required: r },
    { key: "guest_last_name", label: "Guest last name", type: "string", required: r },
    { key: "guest_email", label: "Guest email", type: "string", required: r },
    { key: "guest_phone", label: "Guest phone", type: "string" },
    {
      key: "accommodation",
      label: "Accommodation total (minor units)",
      type: "number",
      required: r,
      hint: "Integer in the smallest currency unit, e.g. 150000 for 1,500.00 USD (0 or more).",
      validation: { integer: true, min: 0 },
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: r,
      placeholder: "USD",
      hint: "ISO 4217 code.",
    },
    {
      key: "cleaning_fee",
      label: "Cleaning fee (minor units)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "pet_fee",
      label: "Pet fee (minor units)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "other_fees",
      label: "Other fees",
      type: "json",
      hint: 'JSON array of {"label": string, "amount": integer} entries, amounts in minor units.',
    },
    { key: "notes", label: "Notes", type: "text", hint: "Host notes on the reservation." },
    {
      key: "language",
      label: "Guest language",
      type: "select",
      required: r,
      options: LANGUAGES.map((l) => ({ value: l, label: l })),
    },
  ];
}
