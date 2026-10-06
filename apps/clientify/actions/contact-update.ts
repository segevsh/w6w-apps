import type { ActionDefinition } from "@w6w/types";
import { asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `PUT /v1/contacts/{contactId}/` — Update a contact (PUT). Clientify's own example sends only the fields being changed.
 */
interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  title?: string;
  company?: string;
  description?: string;
  remarks?: string;
  summary?: string;
  extra?: unknown;
}

const contactUpdate: ActionDefinition<Input, unknown> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact (PUT). Clientify's own example sends only the fields being changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "company", label: "Company name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "remarks", label: "Remarks", type: "text" },
    { key: "summary", label: "Summary", type: "text" },
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
    return client.request(`/v1/contacts/${encodeURIComponent(input.contactId)}/`, {
      method: "PUT",
      body: compact({
        ...asObject(input.extra, "extra"),
        first_name: input.firstName,
        last_name: input.lastName,
        status: input.status,
        title: input.title,
        company: input.company,
        description: input.description,
        remarks: input.remarks,
        summary: input.summary,
      }),
    });
  },
};

export default contactUpdate;
