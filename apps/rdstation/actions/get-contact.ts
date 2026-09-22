import type { ActionDefinition } from "@w6w/types";

import { API_BASE, sendJson } from "../lib/client.ts";

/**
 * `GET /contacts/{contact_id}` — one contact, verbatim.
 *
 * The body is the CRM's own contact object, returned as-is: its fields are the
 * vendor's (`_id`, `name`, `emails`, `phones`, `organization`, the standard
 * custom fields, …) and re-shaping them here would be invention.
 *
 * Whether this call returns anything depends on the token's **visibility
 * level** for contatos (Restrito/Equipe/Geral). A user whose level hides a
 * contact gets the not-found response rather than the record.
 */
interface Input {
  contactId: string;
}

const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one CRM contact by its id.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The contact's `_id`, as returned by List Contacts.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "emails", type: "array", label: "Emails" },
    { key: "phones", type: "array", label: "Phones" },
    { key: "title", type: "string", label: "Job title" },
    { key: "organization", type: "object", label: "Organization" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/contacts/${encodeURIComponent(input.contactId)}`);
    return sendJson(ctx, url);
  },
};

export default getContact;
