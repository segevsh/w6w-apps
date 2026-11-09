import { webhookTrigger } from "../lib/triggers.ts";

/** Mailgun delivers, open, click, failure, complaint and unsubscribe events for a domain. */
const emailEvent = webhookTrigger({
  key: "email-event",
  title: "Email Event",
  description:
    "Fires when Mailgun reports a delivered, opened, clicked, failed, complained or unsubscribed event on a domain. The run gets the event, recipient, message id, failure severity and reason, clicked URL, tags and the full event data.",
});

export default emailEvent;
