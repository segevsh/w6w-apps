import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `click` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const campaignLinkClicked = eventTrigger({
  key: "campaign-link-clicked",
  title: "Campaign Link Clicked",
  description:
    "Fires when a contact clicks a link in a campaign email. The run gets the campaign, the link, the contact and the full payload.",
  event: "click",
  sample: {
    type: "click",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    data: {
      type: "click",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
      campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    },
  },
});

export default campaignLinkClicked;
