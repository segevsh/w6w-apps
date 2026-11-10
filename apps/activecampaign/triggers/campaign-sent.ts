import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `sent` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const campaignSent = eventTrigger({
  key: "campaign-sent",
  title: "Campaign Sent",
  description:
    "Fires when an email campaign is sent (not autoresponder or automation campaigns). The run gets the campaign and the full payload.",
  event: "sent",
  sample: {
    type: "sent",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    data: {
      type: "sent",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
      campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    },
  },
});

export default campaignSent;
