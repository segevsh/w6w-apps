import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    await client.request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "DELETE",
    });
    return { id: input.contactId, deleted: true };
  },
};

export default deleteContact;
