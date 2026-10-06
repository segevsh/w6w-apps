import type { Param } from "@w6w/types";
import { idOf, jsonObject, unset } from "./client.ts";

/** What a write returns when the caller names no fields: enough to correlate and nothing sensitive. */
export const WRITE_DEFAULT_FIELDS = "id,email,firstName,lastName,campaignId,createdAt,updatedAt";

/**
 * The editable prospect fields worth a form control. Everything else the
 * Prospect page lists as editable (address, industry, annualRevenue, notes, …)
 * and every custom field (`Name__c`) goes through `additionalFields`.
 */
export const prospectFieldParams: Param[] = [
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "company", label: "Company", type: "string" },
  { key: "jobTitle", label: "Job title", type: "string" },
  { key: "phone", label: "Phone", type: "string" },
  { key: "website", label: "Website", type: "string" },
  {
    key: "campaignId",
    label: "Campaign ID",
    type: "number",
    hint: "If omitted on create, the prospect joins the account's oldest campaign.",
  },
  { key: "score", label: "Score", type: "number" },
  { key: "isDoNotEmail", label: "Do not email", type: "boolean" },
  { key: "isDoNotCall", label: "Do not call", type: "boolean" },
  {
    key: "additionalFields",
    label: "Additional fields",
    type: "json",
    hint:
      'Any other editable field, including custom fields: { "city": "Atlanta", "Food_Preference__c": "Vegan" }. Wins over the controls above on a clash.',
  },
];

const SCALARS = [
  "firstName",
  "lastName",
  "company",
  "jobTitle",
  "phone",
  "website",
  "campaignId",
  "score",
  "isDoNotEmail",
  "isDoNotCall",
] as const;

export interface ProspectInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  website?: string;
  campaignId?: number;
  score?: number;
  isDoNotEmail?: boolean;
  isDoNotCall?: boolean;
  additionalFields?: unknown;
  fields?: string;
}

/** Build the prospect representation: blank controls are omitted, so an update leaves them unchanged. */
export function prospectBody(input: ProspectInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const email = unset(input.email);
  if (email !== undefined) body.email = email;
  for (const k of SCALARS) {
    const v = unset(input[k] as string | number | boolean | undefined);
    if (v !== undefined) body[k] = v;
  }
  return { ...body, ...jsonObject(input.additionalFields, "additionalFields") };
}

export { idOf };
