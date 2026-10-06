import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  contactListId: string;
}

/** Remove a contact from a contact list (the contact itself is kept). */
const contactRemoveFromList: ActionDefinition<Input> = {
  key: "contact-remove-from-list",
  type: "perform",
  resource: "contact",
  title: "Remove Contact from List",
  description: "Remove a contact from a contact list (the contact itself is kept).",
  idempotent: true,
  params: [
    { "key": "contactId", "label": "Contact ID", "type": "string", "required": true },
    { "key": "contactListId", "label": "Contact list ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(
      `/contacts/${seg(input.contactId)}/contact-lists/${seg(input.contactListId)}`,
      { method: "DELETE" },
    );
  },
};

export default contactRemoveFromList;
