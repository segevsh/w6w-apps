import type { ActionDefinition } from "@w6w/types";
import { asJson, asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/contacts/` — Create a contact. Clientify does not de-duplicate on a retry, so this action is not marked idempotent.
 */
interface Input {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  title?: string;
  company?: string;
  contactType?: string;
  contactSource?: string;
  description?: string;
  remarks?: string;
  summary?: string;
  tags?: unknown;
  addresses?: unknown;
  gdprAccept?: boolean;
  extra?: unknown;
}

const contactCreate: ActionDefinition<Input, unknown> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. Clientify does not de-duplicate on a retry, so this action is not marked idempotent.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Contact status identifier, e.g. cold-lead, warm-lead, in-deal.",
    },
    { key: "title", label: "Job title", type: "string" },
    {
      key: "company",
      label: "Company name",
      type: "string",
      hint: "A company NAME; Clientify links or creates the company.",
    },
    { key: "contactType", label: "Contact type", type: "string" },
    { key: "contactSource", label: "Contact source", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "remarks", label: "Remarks", type: "text" },
    { key: "summary", label: "Summary", type: "text" },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint: 'JSON array of tag names, e.g. ["lead","web"].',
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      hint:
        'JSON array, e.g. [{"street":"\u2026","city":"\u2026","state":"\u2026","country":"\u2026","postal_code":"\u2026","type":1}].',
    },
    { key: "gdprAccept", label: "GDPR accepted", type: "boolean" },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint:
        "Further body fields as a JSON object (anything the Clientify API accepts that is not listed above, e.g. custom_fields). Named parameters win on a clash.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/contacts/`, {
      method: "POST",
      body: compact({
        ...asObject(input.extra, "extra"),
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        status: input.status,
        title: input.title,
        company: input.company,
        contact_type: input.contactType,
        contact_source: input.contactSource,
        description: input.description,
        remarks: input.remarks,
        summary: input.summary,
        tags: asJson(input.tags),
        addresses: asJson(input.addresses),
        gdpr_accept: input.gdprAccept,
      }),
    });
  },
};

export default contactCreate;
