import type { Param } from "@w6w/types";

export const itemsPerPageParam: Param = {
  key: "itemsPerPage",
  label: "Items per page",
  type: "number",
  hint: "Page size. The vendor's default is 25. The response's `links` and `meta` say where the " +
    "next page is.",
  validation: { integer: true, min: 1 },
};

export const subAccountIdFilterParam: Param = {
  key: "subAccountId",
  label: "Sub-account ID",
  type: "number",
  hint: "Only return results that belong to this sub-account.",
};

export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", required: true, ...(hint ? { hint } : {}) };
}

export const MAILER_TYPES = [
  "postcard",
  "postcard6x9",
  "postcard6x11",
  "letter",
  "windowlessletter",
  "notecard",
  "giftcard",
  "magnacard",
] as const;

/** Recipient fields shared by Create / Update (names verbatim from the OpenAPI `recipient`). */
export const recipientFieldParams: Param[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "company", label: "Company", type: "string" },
  { key: "address", label: "Address", type: "string" },
  { key: "address2", label: "Address line 2", type: "string" },
  { key: "city", label: "City", type: "string" },
  { key: "province", label: "State / province", type: "string" },
  { key: "postalCode", label: "Postal code", type: "string" },
  { key: "country", label: "Country", type: "string" },
  { key: "email", label: "Email", type: "string" },
  { key: "phone", label: "Phone", type: "string" },
  {
    key: "dob",
    label: "Date of birth",
    type: "string",
    hint: "ISO 8601 (YYYY-MM-DD); MM/DD/YYYY is also accepted and converted.",
  },
  {
    key: "anniversary",
    label: "Anniversary",
    type: "string",
    hint: "ISO 8601 (YYYY-MM-DD); any recurring annual milestone.",
  },
  {
    key: "custom",
    label: "Custom fields",
    type: "json",
    hint: 'Object of custom1..custom10, e.g. {"custom1":"gold-tier"}.',
  },
];

/** Map the camelCase recipient inputs to the vendor's snake_case body. */
export function recipientBody(input: Record<string, unknown>): Record<string, unknown> {
  const custom = input.custom;
  let customFields: Record<string, unknown> = {};
  if (custom !== undefined && custom !== null && custom !== "") {
    customFields = typeof custom === "string"
      ? (() => {
        try {
          return JSON.parse(custom);
        } catch {
          throw new Error("Custom fields is not valid JSON");
        }
      })()
      : custom as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {
    name: input.name,
    company: input.company,
    address: input.address,
    address2: input.address2,
    city: input.city,
    province: input.province,
    postal_code: input.postalCode,
    country: input.country,
    email: input.email,
    phone: input.phone,
    dob: input.dob,
    anniversary: input.anniversary,
    ...customFields,
  };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined || out[k] === null || out[k] === "") delete out[k];
  }
  return out;
}
