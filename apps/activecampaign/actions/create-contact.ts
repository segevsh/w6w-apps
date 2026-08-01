import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient, compact } from "../lib/client.ts";

interface Input {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fieldValues?: Array<{ field: string; value: string }>;
}

const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact. Email or phone is required (per your account's settings).",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", placeholder: "name@email.com" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    {
      key: "fieldValues",
      label: "Custom Field Values",
      type: "json",
      hint: 'Array of `{ "field": "<custom field id>", "value": "..." }`.',
    },
  ],
  output: [
    { key: "contact", type: "object", label: "Contact" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/contacts", {
      method: "POST",
      body: {
        contact: compact({
          email: input.email,
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          fieldValues: input.fieldValues,
        }),
      },
    });
  },
};

export default createContact;
