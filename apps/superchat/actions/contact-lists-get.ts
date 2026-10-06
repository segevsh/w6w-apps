import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  contactListId: string;
}

/** Fetch one contact list by ID. */
const contactListsGet: ActionDefinition<Input> = {
  key: "contact-lists-get",
  type: "read",
  resource: "contact-list",
  title: "Get Contact List",
  description: "Fetch one contact list by ID.",
  params: [
    { "key": "contactListId", "label": "Contact list ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/contact-lists/${seg(input.contactListId)}`);
  },
};

export default contactListsGet;
