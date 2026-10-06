import type { Param } from "@w6w/types";

/** Page / per-page / cursor params every Simplero collection accepts. */
export const paginationParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Page number (default 1). Ignored when `After` is given.",
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 20,
    validation: { integer: true, min: 1, max: 100 },
    hint: "Results per page, 1-100 (Simplero's default is 20).",
  },
  {
    key: "after",
    label: "After (cursor)",
    type: "number",
    validation: { integer: true, min: 0 },
    hint: "Cursor paging: return records with an id greater than this. Pass the previous " +
      "result's `nextAfter`. Takes precedence over `Page`, always sorts by id ascending, and is " +
      "cheaper than a deep page number on a large account.",
  },
];

export const searchParam: Param = {
  key: "q",
  label: "Search",
  type: "string",
  hint: "Free-text search across the record's main fields.",
};

/** The `{id}` of a record in a `/{resource}/{id}` path. */
export function idParam(label: string, hint?: string): Param {
  return {
    key: "id",
    label,
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint: hint ?? "Simplero's numeric id for this record.",
  };
}

/** The contact a `/customers/{id}/actions/*` call applies to. */
export const contactIdParam: Param = idParam(
  "Contact ID",
  "Simplero's numeric contact id (the `customers` resource), e.g. from List Contacts.",
);

export function refParam(key: string, label: string, hint: string): Param {
  return {
    key,
    label,
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint,
  };
}

/** Drop undefined / null / empty-string entries so optional inputs never reach the wire. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export interface PageInput {
  page?: number;
  perPage?: number;
  after?: number;
  q?: string;
}

/** Map the shared pagination/search inputs onto Simplero's query keys. */
export function pageQuery(input: PageInput): Record<string, unknown> {
  return compact({ page: input.page, per_page: input.perPage, after: input.after, q: input.q });
}

/** The writable contact fields (Simplero's `Customer` schema, minus its read-only ones). */
export const contactFieldParams: Param[] = [
  { key: "firstNames", label: "First name(s)", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "phoneNumber", label: "Phone number", type: "string" },
  {
    key: "locale",
    label: "Locale",
    type: "string",
    hint: "Language code for the contact's emails, e.g. `en`.",
  },
  { key: "doNotContact", label: "Do not contact", type: "boolean", hint: "Suppress all email." },
  { key: "doNotSms", label: "Do not SMS", type: "boolean", hint: "Suppress all text messages." },
  { key: "gdprConsent", label: "GDPR consent given", type: "boolean" },
];

export interface ContactFields {
  firstNames?: string;
  lastName?: string;
  phoneNumber?: string;
  locale?: string;
  doNotContact?: boolean;
  doNotSms?: boolean;
  gdprConsent?: boolean;
}

/** Map the contact inputs onto Simplero's snake_case write body. */
export function contactBody(input: ContactFields & { email?: string }): Record<string, unknown> {
  return compact({
    email: input.email,
    first_names: input.firstNames,
    last_name: input.lastName,
    phone_number: input.phoneNumber,
    locale: input.locale,
    do_not_contact: input.doNotContact,
    do_not_sms: input.doNotSms,
    gdpr_consent: input.gdprConsent,
  });
}
