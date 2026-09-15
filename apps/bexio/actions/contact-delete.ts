import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact by ID.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).delete(`/2.0/contact/${encodeURIComponent(input.contactId)}`);
  },
};

export default contactDelete;
