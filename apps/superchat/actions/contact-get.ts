import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/** Fetch one contact by ID. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by ID.",
  params: [
    { "key": "contactId", "label": "Contact ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/contacts/${seg(input.contactId)}`);
  },
};

export default contactGet;
