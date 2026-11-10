import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `contact_tag_added` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const contactTagAdded = eventTrigger({
  key: "contact-tag-added",
  title: "Contact Tag Added",
  description:
    "Fires when a tag is added to a contact. The run gets the contact, the tag and the full payload.",
  event: "contact_tag_added",
  sample: {
    type: "contact_tag_added",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: null,
    data: {
      type: "contact_tag_added",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    },
  },
});

export default contactTagAdded;
