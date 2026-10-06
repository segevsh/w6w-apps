import type { ActionDefinition } from "@w6w/types";
import { asObject, ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts/` — List or search contacts. `query` matches first name, last name and email; further filters (phone, contact_source, contact_type, created/modified with [gt]/[lt]/[gte]/[lte], and custom fields as cf_<name>) go in `filters`.
 */
interface Input {
  query?: string;
  contactSource?: string;
  contactType?: string;
  page?: number;
  filters?: unknown;
}

const contactList: ActionDefinition<Input, unknown> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "List or search contacts. `query` matches first name, last name and email; further filters (phone, contact_source, contact_type, created/modified with [gt]/[lt]/[gte]/[lte], and custom fields as cf_<name>) go in `filters`.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Matches first name, last name and email.",
    },
    { key: "contactSource", label: "Contact source", type: "string" },
    { key: "contactType", label: "Contact type", type: "string" },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; Clientify returns at most 100 results per page.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "filters",
      label: "Extra filters",
      type: "json",
      hint:
        'Further query filters as a JSON object, e.g. {"created[gt]": "2024/01/01", "modified[lt]": "2024/02/01"}. Named parameters win on a clash.',
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/contacts/`, {
      method: "GET",
      query: {
        ...asObject(input.filters, "filters"),
        "query": input.query,
        "contact_source": input.contactSource,
        "contact_type": input.contactType,
        "page": input.page,
      },
    });
  },
};

export default contactList;
