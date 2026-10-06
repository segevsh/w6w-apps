import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/contacts/{contactId}/` — Delete a contact. Clientify answers 204 with no body, so the action returns `{ deleted: true, id }`.
 */
interface Input {
  contactId: string;
}

const contactDelete: ActionDefinition<Input, unknown> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact. Clientify answers 204 with no body, so the action returns `{ deleted: true, id }`.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Deleted record id" },
  ],

  async execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    await client.request(`/v1/contacts/${encodeURIComponent(input.contactId)}/`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.contactId };
  },
};

export default contactDelete;
