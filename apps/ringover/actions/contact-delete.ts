import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact.",
  idempotent: true,
  params: [
    contactIdParam,
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "contactId", type: "number", label: "Contact ID" },
  ],

  async execute(input, ctx) {
    await new RingoverClient(ctx).request("DELETE", `/contacts/${seg(input.contactId)}`);
    return { deleted: true, contactId: input.contactId };
  },
};

export default contactDelete;
