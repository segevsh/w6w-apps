import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  contactUuid: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  idempotent: true,
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact from the 2Chat directory (DELETE /contacts/{contact-uuid}).",
  params: [
    {
      key: "contactUuid",
      label: "Contact UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.delete(`/contacts/${seg(input.contactUuid)}`);
  },
};

export default contactDelete;
