import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): send. */
const emailSent = webhookTrigger({
  key: "email-sent",
  title: "Email Sent",
  description:
    "Fires when Mandrill accepts and sends a message (event send). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["send"],
});

export default emailSent;
