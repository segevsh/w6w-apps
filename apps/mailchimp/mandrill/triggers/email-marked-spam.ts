import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): spam. */
const emailMarkedSpam = webhookTrigger({
  key: "email-marked-spam",
  title: "Email Marked as Spam",
  description:
    "Fires when a recipient marks a message as spam (event spam). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["spam"],
});

export default emailMarkedSpam;
