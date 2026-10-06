import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  contactListId: string;
}

/** Add a contact to a contact list. */
const contactAddToList: ActionDefinition<Input> = {
  key: "contact-add-to-list",
  type: "perform",
  resource: "contact",
  title: "Add Contact to List",
  description: "Add a contact to a contact list.",
  idempotent: true,
  params: [
    { "key": "contactId", "label": "Contact ID", "type": "string", "required": true },
    { "key": "contactListId", "label": "Contact list ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Contact list ID" },
    { "key": "name", "type": "string", "label": "Contact list name" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/contacts/${seg(input.contactId)}/contact-lists`, {
      method: "POST",
      body: { id: input.contactListId },
    });
  },
};

export default contactAddToList;
