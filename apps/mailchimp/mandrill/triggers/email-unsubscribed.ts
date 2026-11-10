import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): unsub. */
const emailUnsubscribed = webhookTrigger({
  key: "email-unsubscribed",
  title: "Email Unsubscribed",
  description:
    "Fires when a recipient unsubscribes through a message (event unsub). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["unsub"],
});

export default emailUnsubscribed;
