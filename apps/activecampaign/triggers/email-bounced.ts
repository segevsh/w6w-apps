import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `bounce` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const emailBounced = eventTrigger({
  key: "email-bounced",
  title: "Email Bounced",
  description:
    "Fires when a campaign email bounces. The run gets the campaign, the bounce type, code and description, the contact and the full payload.",
  event: "bounce",
  sample: {
    type: "bounce",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    data: {
      type: "bounce",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
      campaign: { id: "12", name: "Spring sale", status: "5", type: "single" },
    },
  },
});

export default emailBounced;
