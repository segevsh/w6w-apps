import { webhookTrigger } from "../lib/triggers.ts";

const attendeeUpdated = webhookTrigger({
  key: "attendee-updated",
  title: "Attendee Updated",
  description:
    "Fires when an attendee's details change. The run gets the attendee as they are now.",
  action: "attendee.updated",
});

export default attendeeUpdated;
