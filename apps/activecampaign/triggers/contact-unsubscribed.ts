import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `unsubscribe` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const contactUnsubscribed = eventTrigger({
  key: "contact-unsubscribed",
  title: "Contact Unsubscribed",
  description:
    "Fires when a contact unsubscribes. The run gets the contact, the campaign it came from where there is one, and the full payload.",
  event: "unsubscribe",
  sample: {
    type: "unsubscribe",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: null,
    data: {
      type: "unsubscribe",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    },
  },
});

export default contactUnsubscribed;
