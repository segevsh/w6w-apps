import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): open. */
const emailOpened = webhookTrigger({
  key: "email-opened",
  title: "Email Opened",
  description:
    "Fires when a recipient opens a message (event open). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["open"],
});

export default emailOpened;
