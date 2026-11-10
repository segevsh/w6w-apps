import { webhookTrigger } from "../lib/triggers.ts";

/** A contact is created (webhook event `ContactCreate`). */
const contactCreated = webhookTrigger({
  key: "contact-created",
  title: "New Contact",
  description:
    "Fires when a contact is created in a HighLevel location (webhook event ContactCreate). The run gets the location id, the contact id and the full contact payload (name, email, phone, tags, custom fields).",
  eventType: "ContactCreate",
  sample: {
    type: "ContactCreate",
    locationId: "sample-location-id",
    id: "sample-contact-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "ContactCreate",
      locationId: "sample-location-id",
      id: "sample-contact-id",
      name: "John Deo",
      firstName: "John",
      lastName: "Deo",
      email: "john@example.com",
      phone: "+15555550100",
      tags: ["lead"],
      dateAdded: "2026-11-10T12:41:02.193Z",
    },
  },
});

export default contactCreated;
