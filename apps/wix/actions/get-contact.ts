import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/** `GET /contacts/v4/contacts/{id}` — handler `wix.contacts.v4.contact:GetContact`. */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Retrieve a single contact by id, including the `revision` that Update Contact requires.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    return new WixClient(ctx).request(
      `/contacts/v4/contacts/${encodeURIComponent(input.contactId)}`,
    );
  },
};

export default getContact;
