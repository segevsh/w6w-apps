import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  encodeId,
  HoneyBookClient,
  nonEmpty,
  toList,
} from "../lib/client.ts";
import { contactIncludeParams } from "../lib/params.ts";

interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  websiteUrl?: string;
  companyName?: string;
  jobTitle?: string;
  companyType?: string;
  privateNotes?: string;
  preferred?: boolean;
  clientOrganization?: unknown;
  customFields?: unknown;
  smsConsentConfirmed?: boolean;
  include?: string[] | string;
  maxActionSuggestions?: number;
  maxWorkspaces?: number;
  maxTags?: number;
  maxCustomFields?: number;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact (partial; data fields only).",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "Contact id (BSON ObjectId hex).",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "websiteUrl", label: "Website URL", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "companyType", label: "Company type", type: "string" },
    { key: "privateNotes", label: "Private notes", type: "text" },
    { key: "preferred", label: "Preferred", type: "boolean" },
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
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone_number: input.phoneNumber,
      address: input.address,
      website_url: input.websiteUrl,
      company_name: input.companyName,
      job_title: input.jobTitle,
      company_type: input.companyType,
      private_notes: input.privateNotes,
      preferred: input.preferred,
      client_organization: asOptionalJson(input.clientOrganization, "clientOrganization"),
      custom_fields: asOptionalJson(input.customFields, "customFields"),
      sms_consent_confirmed: input.smsConsentConfirmed,
      include: toList(input.include),
      max_action_suggestions: input.maxActionSuggestions,
      max_workspaces: input.maxWorkspaces,
      max_tags: input.maxTags,
      max_custom_fields: input.maxCustomFields,
    });
    const result = await new HoneyBookClient(ctx).request(
      "PATCH",
      `/contacts/${encodeId(input.contactId)}`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default contactUpdate;
