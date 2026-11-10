import { webhookTrigger } from "../lib/triggers.ts";

/** Patreon trigger `members:delete`. */
const memberDeleted = webhookTrigger({
  key: "member-deleted",
  title: "Member Deleted",
  description:
    "Fires when a campaign membership is deleted on a Patreon campaign (trigger members:delete). The member resource: patron status and the campaign and user it belonged to.",
  trigger: "members:delete",
  sample: {
    trigger: "members:delete",
    resourceType: "member",
    resourceId: "d485d5ac-6c82-42c6-9c08-c50cf01b73d7",
    campaignId: "123456",
    attributes: {
      full_name: "Sample Patron",
      patron_status: "former_patron",
      currently_entitled_amount_cents: 0,
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

export default memberDeleted;
