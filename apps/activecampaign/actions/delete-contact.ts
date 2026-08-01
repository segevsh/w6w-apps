import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (200 on success)" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request(`/contacts/${input.contactId}`, {
      method: "DELETE",
    });
  },
};

export default deleteContact;
