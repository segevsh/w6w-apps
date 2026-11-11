import { webhookTrigger } from "../lib/triggers.ts";

/** A contact's tags change (webhook event `ContactTagUpdate`). */
const contactTagUpdated = webhookTrigger({
  key: "contact-tag-updated",
  title: "Contact Tags Changed",
  description:
    "Fires when the tags of a contact change in a HighLevel location (webhook event ContactTagUpdate). The run gets the location id, the contact id and the full contact payload with its current tags.",
  eventType: "ContactTagUpdate",
  sample: {
    type: "ContactTagUpdate",
    locationId: "sample-location-id",
    id: "sample-contact-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "ContactTagUpdate",
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

export default contactTagUpdated;
