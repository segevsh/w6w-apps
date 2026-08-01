import type { ActionDefinition } from "@w6w/types";
import { jsonObject, XeroClient } from "../lib/client.ts";
import { contactId } from "../lib/params.ts";

interface Input {
  contactId: string;
  fields: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update an existing contact's fields.",
  // POSTing the same field set twice converges on the same record.
  idempotent: true,
  params: [
    contactId,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        'Object of Xero field names -> values, e.g. { "EmailAddress": "new@b.com", "ContactStatus": "ACTIVE" }.',
    },
  ],
  output: [{ key: "Contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request(`/Contacts/${encodeURIComponent(input.contactId)}`, {
      method: "POST",
      body: { Contacts: [jsonObject(input.fields, "fields")] },
    });
  },
};

export default contactUpdate;
