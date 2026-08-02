import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient, jsonObject, normalizeCsv } from "../lib/client.ts";

interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  tags?: string | string[];
  assignedTo?: string;
  additionalFields?: unknown;
}

const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "address1", label: "Address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "website", label: "Website", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names. Replaces the tag list.",
    },
    { key: "assignedTo", label: "Assigned user ID", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "Object merged into the payload.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "Updated contact" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "PUT",
      body: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address1: input.address1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        companyName: input.companyName,
        website: input.website,
        tags: normalizeCsv(input.tags),
        assignedTo: input.assignedTo,
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default updateContact;
