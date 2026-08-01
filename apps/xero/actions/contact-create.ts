import type { ActionDefinition } from "@w6w/types";
import { jsonObject, XeroClient } from "../lib/client.ts";

interface Input {
  name: string;
  additionalFields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact (customer or supplier).",
  // Xero mints a new ContactID per call and offers no request key, so a retry
  // creates a duplicate contact.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the Contact object using Xero\'s field names, e.g. { "EmailAddress": "a@b.com", "FirstName": "Ada", "Phones": [{ "PhoneType": "MOBILE", "PhoneNumber": "555-0100" }] }.',
    },
  ],
  output: [{ key: "Contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/Contacts", {
      method: "POST",
      body: {
        Contacts: [
          { Name: input.name, ...jsonObject(input.additionalFields, "additionalFields") },
        ],
      },
    });
  },
};

export default contactCreate;
