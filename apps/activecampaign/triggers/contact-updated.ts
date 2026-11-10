import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `update` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const contactUpdated = eventTrigger({
  key: "contact-updated",
  title: "Contact Updated",
  description:
    "Fires when a contact's details are updated. The run gets the contact (id, email, name, phone, tags and custom fields) and the full payload.",
  event: "update",
  sample: {
    type: "update",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    deal: null,
    campaign: null,
    data: {
      type: "update",
      contact: { id: "42", email: "ada@example.com", first_name: "Ada", last_name: "Lovelace" },
    },
  },
});

export default contactUpdated;
