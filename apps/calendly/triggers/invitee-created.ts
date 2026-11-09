import { webhookTrigger } from "../lib/triggers.ts";

/** Someone books a meeting. */
const inviteeCreated = webhookTrigger({
  key: "invitee-created",
  title: "Invitee Scheduled",
  description:
    "Fires when someone books a Calendly meeting. The run gets the invitee, the event time and location, and their answers to your questions.",
  event: "invitee.created",
});

export default inviteeCreated;
