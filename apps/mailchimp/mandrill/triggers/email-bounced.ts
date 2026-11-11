import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): hard_bounce,soft_bounce. */
const emailBounced = webhookTrigger({
  key: "email-bounced",
  title: "Email Bounced",
  description:
    "Fires when a message hard-bounces or soft-bounces (events hard_bounce, soft_bounce). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["hard_bounce", "soft_bounce"],
});

export default emailBounced;
