import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient, jsonObject, normalizeCsv } from "../lib/client.ts";

interface Input {
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
  source?: string;
  tags?: string | string[];
  assignedTo?: string;
  additionalFields?: unknown;
}

const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact in the connected location.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string", hint: "E.164, e.g. +14155551234." },
    { key: "address1", label: "Address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "ISO 3166-1 alpha-2, e.g. US." },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "source", label: "Source", type: "string", hint: "Free-text lead source label." },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    { key: "assignedTo", label: "Assigned user ID", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "Object merged into the payload, e.g. custom fields: " +
        '`{ "customFields": [{ "id": "abc123", "value": "gold" }] }`.',
    },
  ],
  output: [{ key: "contact", type: "object", label: "Created contact" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/contacts/", {
      method: "POST",
      body: {
        locationId: client.locationId,
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
        source: input.source,
        tags: normalizeCsv(input.tags),
        assignedTo: input.assignedTo,
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default createContact;
