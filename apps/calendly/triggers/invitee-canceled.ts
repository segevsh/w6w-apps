import { webhookTrigger } from "../lib/triggers.ts";

/** An invitee cancels a booked meeting. */
const inviteeCanceled = webhookTrigger({
  key: "invitee-canceled",
  title: "Invitee Canceled",
  description:
    "Fires when an invitee cancels a Calendly meeting. The run gets the invitee, the meeting that was canceled and the cancellation reason.",
  event: "invitee.canceled",
});

export default inviteeCanceled;
