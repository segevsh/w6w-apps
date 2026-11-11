import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): reject. */
const emailRejected = webhookTrigger({
  key: "email-rejected",
  title: "Email Rejected",
  description:
    "Fires when Mandrill rejects a message before sending (event reject). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["reject"],
});

export default emailRejected;
