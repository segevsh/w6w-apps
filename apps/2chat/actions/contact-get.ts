import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  contactUuid: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get one contact by UUID (GET /contacts/{contact-uuid}).",
  params: [
    {
      key: "contactUuid",
      label: "Contact UUID",
      type: "string",
      required: true,
      hint: "Starts with CON. From List or Search Contacts.",
    },
  ],
  output: [
    { key: "contact", type: "object", label: "The contact" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/contacts/${seg(input.contactUuid)}`);
  },
};

export default contactGet;
