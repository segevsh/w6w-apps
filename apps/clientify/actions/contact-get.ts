import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts/{contactId}/` — Get one contact by id, with its emails, phones, addresses, tags, deals and wall entries.
 */
interface Input {
  contactId: string;
}

const contactGet: ActionDefinition<Input, unknown> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Get one contact by id, with its emails, phones, addresses, tags, deals and wall entries.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/contacts/${encodeURIComponent(input.contactId)}/`, {
      method: "GET",
    });
  },
};

export default contactGet;
