import { webhookTrigger } from "../lib/triggers.ts";

const venueUpdated = webhookTrigger({
  key: "venue-updated",
  title: "Venue Updated",
  description: "Fires when a venue changes. The run gets the venue.",
  action: "venue.updated",
});

export default venueUpdated;
