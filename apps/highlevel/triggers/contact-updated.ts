import { webhookTrigger } from "../lib/triggers.ts";

/** A contact's fields change (webhook event `ContactUpdate`). */
const contactUpdated = webhookTrigger({
  key: "contact-updated",
  title: "Contact Updated",
  description:
    "Fires when fields of a contact change in a HighLevel location (webhook event ContactUpdate). The run gets the location id, the contact id and the full contact payload as it is after the change.",
  eventType: "ContactUpdate",
  sample: {
    type: "ContactUpdate",
    locationId: "sample-location-id",
    id: "sample-contact-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "ContactUpdate",
      locationId: "sample-location-id",
      id: "sample-contact-id",
      name: "John Deo",
      firstName: "John",
      lastName: "Deo",
      email: "john@example.com",
      phone: "+15555550100",
      tags: [
        "lead",
      ],
      dateAdded: "2026-11-10T12:41:02.193Z",
      dateUpdated: "2026-11-10T12:41:03.193Z",
    },
  },
});

export default contactUpdated;
