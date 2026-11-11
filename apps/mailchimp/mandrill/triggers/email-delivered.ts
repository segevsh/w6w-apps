import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): delivered. */
const emailDelivered = webhookTrigger({
  key: "email-delivered",
  title: "Email Delivered",
  description:
    "Fires when a message is delivered to the recipient's server (event delivered). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["delivered"],
});

export default emailDelivered;
