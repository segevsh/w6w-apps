import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  contactId: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact by id. Salesmate reports an unknown id as an ObjectNotFound error.",
  idempotent: false,
  params: [
    idParam("contactId", "Contact ID"),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "number", label: "Contact ID" },
  ],

  async execute(input, ctx) {
    await new SalesmateClient(ctx).request(`/contact/v4/${input.contactId}`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.contactId };
  },
};

export default contactDelete;
