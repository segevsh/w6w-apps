import { webhookTrigger } from "../lib/triggers.ts";

/** A location (sub-account) is created (webhook event `LocationCreate`). */
const locationCreated = webhookTrigger({
  key: "location-created",
  title: "New Location",
  description:
    "Fires when a location (sub-account) is created (webhook event LocationCreate). The run gets the new location's id and the payload with the agency (company) id, the name and the email.",
  eventType: "LocationCreate",
  sample: {
    type: "LocationCreate",
    locationId: "sample-location-id",
    id: "sample-location-id",
    contactId: null,
    conversationId: null,
    data: {
      type: "LocationCreate",
      id: "sample-location-id",
      companyId: "sample-company-id",
      name: "Sample location",
      email: "mailer@example.com",
    },
  },
});

export default locationCreated;
