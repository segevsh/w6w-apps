import { webhookTrigger } from "../lib/triggers.ts";

/** Patreon trigger `members:update`. */
const memberUpdated = webhookTrigger({
  key: "member-updated",
  title: "Member Updated",
  description:
    "Fires when a campaign membership changes, including payment charging events on a Patreon campaign (trigger members:update). The member resource: patron status, entitled amount, last charge status and the campaign and user it belongs to.",
  trigger: "members:update",
  sample: {
    trigger: "members:update",
    resourceType: "member",
    resourceId: "d485d5ac-6c82-42c6-9c08-c50cf01b73d7",
    campaignId: "123456",
    attributes: {
      full_name: "Sample Patron",
      patron_status: "active_patron",
      currently_entitled_amount_cents: 500,
      last_charge_status: "Paid",
      lifetime_support_cents: 500,
    },
    relationships: {
      campaign: { data: { id: "123456", type: "campaign" } },
      user: { data: { id: "98765", type: "user" } },
    },
    included: [],
  },
});

export default memberUpdated;
