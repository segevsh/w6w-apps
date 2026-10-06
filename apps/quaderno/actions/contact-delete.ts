import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact. This cannot be undone.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "number", label: "Contact ID" },
  ],

  async execute(input, ctx) {
    await new QuadernoClient(ctx).request(`/contacts/${input.contactId}`, { method: "DELETE" });
    return { deleted: true, id: input.contactId };
  },
};

export default contactDelete;
