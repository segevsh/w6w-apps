import { webhookTrigger } from "../lib/triggers.ts";

/** A contact is deleted (webhook event `ContactDelete`). */
const contactDeleted = webhookTrigger({
  key: "contact-deleted",
  title: "Contact Deleted",
  description:
    "Fires when a contact is deleted in a HighLevel location (webhook event ContactDelete). The run gets the location id, the id of the deleted contact and the contact payload as it was.",
  eventType: "ContactDelete",
  sample: {
    type: "ContactDelete",
    locationId: "sample-location-id",
    id: "sample-contact-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "ContactDelete",
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

export default contactDeleted;
