import type { Param } from "@w6w/types";
import { compact, customFields } from "./client.ts";

export const CUSTOMER_OUTPUT = [
  { key: "id", type: "string" as const, label: "Customer GraphQL ID" },
  { key: "legacyId", type: "string" as const, label: "Legacy ID" },
  { key: "email", type: "string" as const, label: "Email" },
  { key: "firstName", type: "string" as const, label: "First name" },
  { key: "lastName", type: "string" as const, label: "Last name" },
  { key: "company", type: "string" as const, label: "Company" },
  { key: "phoneNumber", type: "string" as const, label: "Phone" },
  { key: "fax", type: "string" as const, label: "Fax" },
  { key: "website", type: "string" as const, label: "Website" },
  { key: "createdAt", type: "string" as const, label: "Created at" },
  { key: "customFields", type: "array" as const, label: "Custom fields" },
];

export interface CustomerFields {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phoneNumber?: string;
  fax?: string;
  website?: string;
  customFields?: unknown;
}

export const customerFieldParams: Param[] = [
  { key: "email", label: "Email", type: "string" },
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "company", label: "Company", type: "string" },
  { key: "phoneNumber", label: "Phone", type: "string" },
  { key: "fax", label: "Fax", type: "string" },
  { key: "website", label: "Website", type: "string", hint: "A full URL." },
  {
    key: "customFields",
    label: "Custom fields",
    type: "json",
    hint:
      'A JSON object `{"name": "value"}` or `[{"name","value"}]`, defined in the Control Panel.',
  },
];

/** `CustomerInput` from the flat form fields; unset fields are not sent. */
export function customerInput(input: CustomerFields): Record<string, unknown> {
  return compact({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    phoneNumber: input.phoneNumber,
    fax: input.fax,
    website: input.website,
    customFields: customFields(input.customFields),
  });
}
