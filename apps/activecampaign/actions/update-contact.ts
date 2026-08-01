import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient, compact } from "../lib/client.ts";

interface Input {
  contactId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fieldValues?: Array<{ field: string; value: string }>;
}

const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact. Only set fields are changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
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
    return new ActiveCampaignClient(ctx).request(`/contacts/${input.contactId}`, {
      method: "PUT",
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

export default updateContact;
