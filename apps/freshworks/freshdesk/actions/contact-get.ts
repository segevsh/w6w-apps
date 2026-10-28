import type { ActionDefinition } from "@w6w/types";
import { FreshdeskClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request(`/contacts/${input.contactId}`);
  },
};

export default contactGet;
