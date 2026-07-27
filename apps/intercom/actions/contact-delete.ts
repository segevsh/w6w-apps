import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/**
 * DELETE /contacts/{id} — permanently delete a contact by its Intercom id.
 * Intercom returns the deleted object's id and an `deleted: true` flag.
 */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact by its Intercom contact ID.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "DELETE",
    });
  },
};

export default contactDelete;
