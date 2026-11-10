import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): deferral. */
const emailDeferred = webhookTrigger({
  key: "email-deferred",
  title: "Email Deferred",
  description:
    "Fires when a message is temporarily deferred by the recipient's server (event deferral). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["deferral"],
});

export default emailDeferred;
