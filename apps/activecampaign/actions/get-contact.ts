import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single contact by ID.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "contact", type: "object", label: "Contact" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request(`/contacts/${input.contactId}`);
  },
};

export default getContact;
