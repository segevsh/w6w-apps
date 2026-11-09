import { twilioTrigger } from "../lib/triggers.ts";

/** A delivery status callback for a message you sent (queued, sent, delivered, failed…). */
const messageStatus = twilioTrigger({
  key: "message-status",
  title: "Message Status Update",
  description:
    "Fires when Twilio reports a new delivery status for a message you sent. The run gets the message SID, its status and any error code.",
  kind: "status",
});

export default messageStatus;
