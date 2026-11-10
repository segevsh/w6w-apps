import { webhookTrigger } from "../lib/triggers.ts";

/** Patreon trigger `members:create`. */
const memberCreated = webhookTrigger({
  key: "member-created",
  title: "Member Created",
  description:
    "Fires when a patron joins the campaign (a new membership, free or paid) on a Patreon campaign (trigger members:create). The member resource: patron status, entitled amount and the campaign and user it belongs to.",
  trigger: "members:create",
  sample: {
    trigger: "members:create",
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

export default memberCreated;
