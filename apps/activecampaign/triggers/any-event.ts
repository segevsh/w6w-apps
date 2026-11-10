import { eventTrigger } from "../lib/triggers.ts";

/** Any ActiveCampaign webhook event (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
export default eventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any ActiveCampaign webhook event you choose (contacts, tags, notes, deals, campaigns, SMS, accounts). Leave Events empty for all of them. The run gets the event name, the contact, deal and campaign where the payload has them, and the full payload.",
  sample: {
    type: "deal_stage_add",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: null,
    deal: null,
    campaign: null,
    data: { type: "deal_stage_add", stage: { id: "3", title: "Negotiation", color: "00ff00" } },
  },
});
