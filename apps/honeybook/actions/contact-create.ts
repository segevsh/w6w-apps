import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, HoneyBookClient, nonEmpty, toList } from "../lib/client.ts";
import { contactIncludeParams } from "../lib/params.ts";

interface Input {
  kind?: string;
  fullName?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  websiteUrl?: string;
  companyName?: string;
  jobTitle?: string;
  companyType?: string;
  privateNotes?: string;
  source?: string;
  clientOrganization?: unknown;
  customFields?: unknown;
  smsConsentConfirmed?: boolean;
  interaction?: unknown;
  include?: string[] | string;
  maxActionSuggestions?: number;
  maxWorkspaces?: number;
  maxTags?: number;
  maxCustomFields?: number;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
    {
      key: "kind",
      label: "Kind",
      type: "select",
      hint: "client (default) or vendor.",
      options: [{ "value": "client", "label": "Client" }, { "value": "vendor", "label": "Vendor" }],
    },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "websiteUrl", label: "Website URL", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "companyType", label: "Company type", type: "string" },
    { key: "privateNotes", label: "Private notes", type: "text" },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [{ "value": "manual", "label": "Manual" }, {
        "value": "vendor_referral",
        "label": "Vendor referral",
      }],
    },
    {
      key: "clientOrganization",
      label: "Client organization",
      type: "json",
      hint:
        "Object: {name (required), phone_number, website_url, address, company_type, private_notes}.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint:
        "Array of {schema_id, value}; value is always an array (a one-element array for a single-value field, option ids for a multi-select).",
    },
    { key: "smsConsentConfirmed", label: "SMS consent confirmed", type: "boolean" },
    {
      key: "interaction",
      label: "Initial interaction",
      type: "json",
      hint: "Object: {type, context_type, interaction_at}.",
    },
    ...contactIncludeParams,
  ],
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "company_id", type: "string", label: "Company id" },
    { key: "client_id", type: "string", label: "Client id" },
    { key: "vendor_id", type: "string", label: "Vendor id" },
    { key: "user_id", type: "string", label: "User id" },
    { key: "client_organization_id", type: "string", label: "Client organization id" },
    { key: "user", type: "object", label: "User" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  async execute(input, ctx) {
    const body = compact({
      kind: input.kind,
      full_name: input.fullName,
      email: input.email,
      phone_number: input.phoneNumber,
      address: input.address,
      website_url: input.websiteUrl,
      company_name: input.companyName,
      job_title: input.jobTitle,
      company_type: input.companyType,
      private_notes: input.privateNotes,
      source: input.source,
      client_organization: asOptionalJson(input.clientOrganization, "clientOrganization"),
      custom_fields: asOptionalJson(input.customFields, "customFields"),
      sms_consent_confirmed: input.smsConsentConfirmed,
      interaction: asOptionalJson(input.interaction, "interaction"),
      include: toList(input.include),
      max_action_suggestions: input.maxActionSuggestions,
      max_workspaces: input.maxWorkspaces,
      max_tags: input.maxTags,
      max_custom_fields: input.maxCustomFields,
    });
    const result = await new HoneyBookClient(ctx).request("POST", `/contacts`, {
      body: nonEmpty(body),
    });
    return result;
  },
};

export default contactCreate;
