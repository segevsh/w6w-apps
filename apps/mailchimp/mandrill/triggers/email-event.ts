import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill reports message events (sent, bounced, opened, clicked, rejected ...) as they happen. */
const emailEvent = webhookTrigger({
  key: "email-event",
  title: "Email Event",
  description:
    "Fires when Mandrill reports a sent, delivered, deferred, bounced, opened, clicked, spam, unsubscribe or rejected event for a message. The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, bounce reason, metadata and the full event data.",
});

export default emailEvent;
