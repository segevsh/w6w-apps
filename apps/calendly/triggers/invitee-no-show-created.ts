import { webhookTrigger } from "../lib/triggers.ts";

/** A host marks an invitee as a no-show. */
const inviteeNoShowCreated = webhookTrigger({
  key: "invitee-no-show-created",
  title: "Invitee Marked No-Show",
  description:
    "Fires when a host marks an invitee as a no-show in Calendly. The run gets the invitee, the meeting they missed and the no-show record.",
  event: "invitee_no_show.created",
});

export default inviteeNoShowCreated;
