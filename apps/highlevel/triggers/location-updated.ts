import { webhookTrigger } from "../lib/triggers.ts";

/** A location (sub-account) is updated (webhook event `LocationUpdate`). */
const locationUpdated = webhookTrigger({
  key: "location-updated",
  title: "Location Updated",
  description:
    "Fires when a location (sub-account) is updated (webhook event LocationUpdate). The run gets the location's id and the payload with the agency (company) id, the name and the email.",
  eventType: "LocationUpdate",
  sample: {
    type: "LocationUpdate",
    locationId: "sample-location-id",
    id: "sample-location-id",
    contactId: null,
    conversationId: null,
    data: {
      type: "LocationUpdate",
      id: "sample-location-id",
      companyId: "sample-company-id",
      name: "Sample location",
      email: "mailer@example.com",
    },
  },
});

export default locationUpdated;
