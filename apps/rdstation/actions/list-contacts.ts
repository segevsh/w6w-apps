import type { ActionDefinition } from "@w6w/types";

import { API_BASE, applyQuery, sendJson } from "../lib/client.ts";

/**
 * `GET /contacts` — the contact list, with the filters the reference documents.
 *
 * `q` is the CRM's free-text search over the contact's name; `email`, `phone`
 * and `title` are exact-match filters on those fields. Paging is 1-based
 * (`page`), `limit` defaults to 20 and is capped at **200** by the API, and only
 * the first **10,000** records of the list are reachable at all.
 *
 * The response is the vendor's own envelope — `{ contacts, has_more, total }` —
 * returned verbatim; `total` is what the *token's visibility level* allows this
 * caller to see, not the account's true total.
 */
interface Input {
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
  email?: string;
  q?: string;
  phone?: string;
  title?: string;
}

const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List CRM contacts with the documented paging, ordering and filters.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Only the first 10,000 records of the list are reachable at all.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      default: 20,
      hint: "The API's default is 20 and its maximum is 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "order",
      label: "Order by",
      type: "string",
      placeholder: "created_at",
      hint: "Field to sort on, as the API names it.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    { key: "q", label: "Name search", type: "string", hint: "Free-text search over the name." },
    { key: "email", label: "Email", type: "string", hint: "Filter by an exact email address." },
    { key: "phone", label: "Phone", type: "string", hint: "Filter by an exact phone number." },
    { key: "title", label: "Job title", type: "string", hint: "Filter by an exact job title." },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts on this page" },
    { key: "has_more", type: "boolean", label: "Whether another page is reachable" },
    { key: "total", type: "number", label: "Records visible to this token" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/contacts`);
    applyQuery(url, {
      page: input.page,
      limit: input.limit,
      order: input.order,
      direction: input.direction,
      email: input.email,
      q: input.q,
      phone: input.phone,
      title: input.title,
    });
    return sendJson(ctx, url);
  },
};

export default listContacts;
