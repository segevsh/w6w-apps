import type { Param } from "@w6w/types";
import { asOptionalJson, compact } from "./client.ts";

/**
 * `ListingApiLeadRequestModel` — the body of both `POST /zapier/requestInfo` and
 * `POST /zapier/scheduleShowing`.
 */
export interface ListingRequestInput {
  name?: string;
  email?: string;
  phone?: string;
  mlsNumber: string;
  mlsRegion: string;
  leadId?: number;
  assignTo?: string | Record<string, unknown>;
  contactPreference?: string;
  preferredTimeToContact?: string;
  preferredAppointmentDay?: string;
  preferredAppointmentTime?: string;
  comments?: string;
  sendAutoResponder?: boolean;
}

export const listingRequestParams = (showing: boolean): Param[] => [
  { key: "mlsNumber", label: "MLS number", type: "string", required: true },
  {
    key: "mlsRegion",
    label: "MLS region",
    type: "string",
    required: true,
    hint: "A name from List MLS Regions.",
  },
  { key: "name", label: "Name", type: "string" },
  { key: "email", label: "Email", type: "string", hint: "Matches or creates the lead." },
  { key: "phone", label: "Phone", type: "string" },
  { key: "leadId", label: "Lead ID", type: "number", hint: "Use instead of name/email/phone." },
  {
    key: "assignTo",
    label: "Assign to agent (JSON)",
    type: "json",
    hint: 'e.g. {"agentUserEmail": "a@b.com"}. Applies when a new lead is created.',
  },
  { key: "contactPreference", label: "Contact preference", type: "string" },
  { key: "preferredTimeToContact", label: "Preferred time to contact", type: "string" },
  {
    key: "preferredAppointmentDay",
    label: "Preferred appointment day",
    type: "string",
    hint: showing ? "Day the lead wants to see the property." : undefined,
  },
  { key: "preferredAppointmentTime", label: "Preferred appointment time", type: "string" },
  { key: "comments", label: "Comments", type: "text" },
  { key: "sendAutoResponder", label: "Send auto-responder", type: "boolean" },
];

export function listingRequestBody(input: ListingRequestInput): Record<string, unknown> {
  return compact({
    name: input.name,
    email: input.email,
    phone: input.phone,
    mlsNumber: input.mlsNumber,
    mlsRegion: input.mlsRegion,
    leadId: input.leadId,
    assignTo: asOptionalJson(input.assignTo, "assignTo"),
    contactPreference: input.contactPreference,
    preferredTimeToContact: input.preferredTimeToContact,
    preferredAppointmentDay: input.preferredAppointmentDay,
    preferredAppointmentTime: input.preferredAppointmentTime,
    comments: input.comments,
    sendAutoResponder: input.sendAutoResponder,
  });
}
