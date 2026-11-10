import { webhookTrigger } from "../lib/triggers.ts";

/** Any Patreon trigger, or the subset the `events` param names. */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the Patreon campaign webhook triggers you choose: members created, updated or deleted, pledges created, updated or deleted, and posts published, updated or deleted. Leave Events empty for all nine. The run gets the resource (member or post) with the trigger that fired.",
  trigger: "any",
  events: "param",
  sample: {
    trigger: "members:update",
    resourceType: "member",
    resourceId: "d485d5ac-6c82-42c6-9c08-c50cf01b73d7",
    campaignId: "123456",
    attributes: {
      full_name: "Sample Patron",
      patron_status: "active_patron",
      currently_entitled_amount_cents: 500,
    },
    relationships: { campaign: { data: { id: "123456", type: "campaign" } } },
    included: [],
  },
});

export default anyEvent;
