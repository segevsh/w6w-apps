import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `open` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const campaignOpened = eventTrigger({
  key: "campaign-opened",
  title: "Campaign Opened",
  description:
    "Fires when a contact opens a campaign email. The run gets the campaign, the contact and the full payload.",
  event: "open",
  sample: {
    type: "open",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    data: {
      type: "open",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
      campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    },
  },
});

export default campaignOpened;
