import { webhookTrigger } from "../lib/triggers.ts";

const organizerUpdated = webhookTrigger({
  key: "organizer-updated",
  title: "Organizer Updated",
  description: "Fires when an organizer profile changes. The run gets the organizer.",
  action: "organizer.updated",
});

export default organizerUpdated;
