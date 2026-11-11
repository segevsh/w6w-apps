import { webhookTrigger } from "../lib/triggers.ts";

/** A host removes an invitee's no-show mark. */
const inviteeNoShowDeleted = webhookTrigger({
  key: "invitee-no-show-deleted",
  title: "Invitee No-Show Removed",
  description:
    "Fires when a host removes the no-show mark from an invitee in Calendly. The run gets the invitee and the meeting.",
  event: "invitee_no_show.deleted",
});

export default inviteeNoShowDeleted;
