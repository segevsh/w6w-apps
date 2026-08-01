import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  automationId: string;
}

const addContactToAutomation: ActionDefinition<Input> = {
  key: "add-contact-to-automation",
  type: "perform",
  resource: "contact-automation",
  title: "Add Contact to Automation",
  description: "Enroll an existing contact into an existing automation.",
  // Re-enrolling the same pair a second time creates a second, independent
  // run through the automation rather than erroring, so this is not safe
  // to retry blindly.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "automationId", label: "Automation ID", type: "string", required: true },
  ],
  output: [
    { key: "contactAutomation", type: "object", label: "Contact-automation enrollment" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/contactAutomations", {
      method: "POST",
      body: {
        contactAutomation: {
          contact: input.contactId,
          automation: input.automationId,
        },
      },
    });
  },
};

export default addContactToAutomation;
