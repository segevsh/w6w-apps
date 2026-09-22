import type { ActionDefinition } from "@w6w/types";

import { API_BASE, jsonInit, sendJson } from "../lib/client.ts";
import { contactBody, type ContactFields, contactParams } from "../lib/contact.ts";

/**
 * `POST /contacts` — create one contact.
 *
 * Body is the documented `{ contact: { … } }`; see `lib/contact.ts` for the
 * field mapping and the simple-value/JSON-array handling of `emails`/`phones`.
 *
 * `idempotent: false` and honestly so: this endpoint has no idempotency key, so
 * a retry after a timeout creates a second contact. A workflow that must not
 * duplicate has to look the contact up first (List Contacts filtered by `email`)
 * or accept the duplicate.
 */
type Input = ContactFields;

const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact in RD Station CRM.",
  idempotent: false,
  params: contactParams,
  output: [
    { key: "_id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "emails", type: "array", label: "Emails" },
    { key: "phones", type: "array", label: "Phones" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/contacts`);
    return sendJson(ctx, url, jsonInit("POST", contactBody(input)));
  },
};

export default createContact;
