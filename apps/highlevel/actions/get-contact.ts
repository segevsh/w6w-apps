import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a contact by id.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request(`/contacts/${encodeURIComponent(input.contactId)}`);
  },
};

export default getContact;
