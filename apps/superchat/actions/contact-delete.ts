import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/** Delete a contact. This cannot be undone. */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "contactId", "label": "Contact ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/contacts/${seg(input.contactId)}`, {
      method: "DELETE",
    });
  },
};

export default contactDelete;
