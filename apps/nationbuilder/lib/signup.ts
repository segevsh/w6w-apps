import type { Param } from "@w6w/types";
import { parseJsonObject } from "./client.ts";
import { ATTRIBUTES_PARAM, CUSTOM_VALUES_PARAM } from "./params.ts";

/**
 * The common fields exposed directly for creating/updating a person
 * ("signup"). NationBuilder's own `signup` schema documents well over a
 * hundred writable attributes (voter-file fields, donation rollups, path
 * status, a dozen boolean flags); the full set is not worth exposing as
 * dedicated params. These are the ones a workflow actually sets day to day —
 * everything else is reachable through `attributes` (any documented
 * attribute name) or `customValues` (a nation's own configured fields).
 */
export const SIGNUP_PARAMS: Param[] = [
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "email", label: "Email", type: "string" },
  { key: "mobileNumber", label: "Mobile number", type: "string" },
  { key: "phoneNumber", label: "Phone number", type: "string" },
  { key: "employer", label: "Employer", type: "string" },
  { key: "note", label: "Note", type: "text" },
  {
    key: "externalId",
    label: "External ID",
    type: "string",
    advanced: true,
    hint: "A unique identifier from a third-party system.",
  },
  { key: "emailOptIn", label: "Opted in to email", type: "boolean", advanced: true },
  { key: "doNotContact", label: "Do not contact", type: "boolean", advanced: true },
  { key: "doNotCall", label: "Do not call", type: "boolean", advanced: true },
  CUSTOM_VALUES_PARAM,
  ATTRIBUTES_PARAM,
];

export interface SignupInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  phoneNumber?: string;
  employer?: string;
  note?: string;
  externalId?: string;
  emailOptIn?: boolean;
  doNotContact?: boolean;
  doNotCall?: boolean;
  customValues?: unknown;
  attributes?: unknown;
}

/** Maps the curated params above onto NationBuilder's documented `signup` attribute names. */
export function signupAttributes(input: SignupInput): Record<string, unknown> {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    mobile_number: input.mobileNumber,
    phone_number: input.phoneNumber,
    employer: input.employer,
    note: input.note,
    external_id: input.externalId,
    email_opt_in: input.emailOptIn,
    do_not_contact: input.doNotContact,
    do_not_call: input.doNotCall,
    custom_values: parseJsonObject(input.customValues),
    ...parseJsonObject(input.attributes),
  };
}
