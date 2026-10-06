import type { Param } from "@w6w/types";
import { asOptionalJson, compact, toList } from "./client.ts";

/**
 * `LeadApiSaveReqModel` (Swagger definitions, fetched 2026-10-06) — the body shared by
 * `POST /zapier/leads` and `PUT /zapier/leads/{id}`. Only fields the document names are sent.
 */
export interface LeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  leadStatus?: string;
  emailStatus?: string;
  phoneStatus?: string;
  lenderStatus?: string;
  listingAgentStatus?: string;
  birthDate?: string;
  homeAnniversaryDate?: string;
  leadType?: string;
  source?: string;
  sourceType?: string;
  siteId?: number;
  note?: string;
  shortSummary?: string;
  tags?: string;
  removeTags?: string;
  referralFee?: boolean;
  partnerLink?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  password?: string;
  sendRegistrationEmail?: boolean;
  assignTo?: string | Record<string, unknown>;
  lender?: string | Record<string, unknown>;
  listingAgent?: string | Record<string, unknown>;
}

const AGENT_HINT = 'JSON object naming an agent by any of: {"agentUserId": 1, "agentUserEmail": ' +
  '"a@b.com", "agentUserPhone": "...", "agentUserFirstName": "...", "agentUserLastName": "...", ' +
  '"agentSiteId": 1}.';

export const leadParams: Param[] = [
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "email", label: "Email", type: "string" },
  { key: "phone", label: "Phone", type: "string" },
  {
    key: "leadStatus",
    label: "Lead status",
    type: "string",
    hint: "A name from List Lead Statuses.",
  },
  {
    key: "emailStatus",
    label: "Email status",
    type: "string",
    hint: "A name from List Email Statuses.",
  },
  {
    key: "phoneStatus",
    label: "Phone status",
    type: "string",
    hint: "A name from List Phone Statuses.",
  },
  { key: "lenderStatus", label: "Lender status", type: "string" },
  { key: "listingAgentStatus", label: "Listing agent status", type: "string" },
  { key: "birthDate", label: "Birth date", type: "string" },
  { key: "homeAnniversaryDate", label: "Home anniversary date", type: "string" },
  { key: "leadType", label: "Lead type", type: "string", hint: "A name from List Lead Types." },
  { key: "source", label: "Lead source", type: "string", hint: "A name from List Lead Sources." },
  { key: "sourceType", label: "Lead source type", type: "string" },
  {
    key: "siteId",
    label: "Site ID",
    type: "number",
    hint: "An id from List Sites; needed on an account with several sites.",
  },
  { key: "note", label: "Note", type: "text", hint: "Added to the lead's timeline." },
  { key: "shortSummary", label: "Short summary", type: "text" },
  { key: "tags", label: "Tags to add", type: "string", hint: "Comma-separated tag names." },
  {
    key: "removeTags",
    label: "Tags to remove",
    type: "string",
    hint: "Comma-separated tag names.",
  },
  { key: "referralFee", label: "Referral fee", type: "boolean" },
  { key: "partnerLink", label: "Partner link", type: "string" },
  { key: "streetAddress", label: "Street address", type: "string" },
  { key: "city", label: "City", type: "string" },
  { key: "state", label: "State", type: "string" },
  { key: "zip", label: "ZIP", type: "string" },
  {
    key: "password",
    label: "Password",
    type: "secret",
    hint: "Initial site-login password for the lead.",
  },
  { key: "sendRegistrationEmail", label: "Send registration email", type: "boolean" },
  { key: "assignTo", label: "Assign to agent (JSON)", type: "json", hint: AGENT_HINT },
  { key: "lender", label: "Lender (JSON)", type: "json", hint: AGENT_HINT },
  { key: "listingAgent", label: "Listing agent (JSON)", type: "json", hint: AGENT_HINT },
];

export function leadBody(input: LeadInput): Record<string, unknown> {
  return compact({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    leadStatus: input.leadStatus,
    emailStatus: input.emailStatus,
    phoneStatus: input.phoneStatus,
    lenderStatus: input.lenderStatus,
    listingAgentStatus: input.listingAgentStatus,
    birthDate: input.birthDate,
    homeAnniversaryDate: input.homeAnniversaryDate,
    leadType: input.leadType,
    source: input.source,
    sourceType: input.sourceType,
    siteId: input.siteId,
    note: input.note,
    shortSummary: input.shortSummary,
    tags: toList(input.tags),
    removeTags: toList(input.removeTags),
    referralFee: input.referralFee,
    partnerLink: input.partnerLink,
    streetAddress: input.streetAddress,
    city: input.city,
    state: input.state,
    zip: input.zip,
    password: input.password,
    sendRegistrationEmail: input.sendRegistrationEmail,
    assignTo: asOptionalJson(input.assignTo, "assignTo"),
    lender: asOptionalJson(input.lender, "lender"),
    listingAgent: asOptionalJson(input.listingAgent, "listingAgent"),
  });
}
