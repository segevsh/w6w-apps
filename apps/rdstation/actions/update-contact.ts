import type { ActionDefinition } from "@w6w/types";

import { API_BASE, jsonInit, sendJson } from "../lib/client.ts";
import { contactBody, type ContactFields, contactParams } from "../lib/contact.ts";

/**
 * `PUT /contacts/{contact_id}` — replace the contact's editable fields.
 *
 * Same body as create (`{ contact: { … } }`, see `lib/contact.ts`), addressed by
 * id. It is a PUT, so fields left empty here are the ones the CRM clears or
 * leaves alone per its own replace semantics — a caller updating one field
 * should send the others it wants kept.
 *
 * `idempotent: true`: re-sending the same `contactId` and body converges on the
 * same record, so a retried step is safe.
 *
 * A token whose visibilidade for contatos is Restrito can only update the
 * contacts it owns; the API answers not-found for anyone else's.
 */
type Input = ContactFields & { contactId: string };

const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Replace the fields of an existing RD Station CRM contact.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The contact's `_id`, as returned by List Contacts or Create Contact.",
    },
    ...contactParams,
  ],
  output: [
    { key: "_id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "emails", type: "array", label: "Emails" },
    { key: "phones", type: "array", label: "Phones" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/contacts/${encodeURIComponent(input.contactId)}`);
    return sendJson(ctx, url, jsonInit("PUT", contactBody(input)));
  },
};

export default updateContact;
