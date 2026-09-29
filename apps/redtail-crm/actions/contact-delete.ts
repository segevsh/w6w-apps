import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

interface Output {
  deleted: boolean;
}

const contactDelete: ActionDefinition<Input, Output> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact. Redtail answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("warn", "deleting Redtail contact", { contactId: input.contactId });
    await new RedtailClient(ctx).request(`/contacts/${input.contactId}`, { method: "DELETE" });
    return { deleted: true };
  },
};

export default contactDelete;
