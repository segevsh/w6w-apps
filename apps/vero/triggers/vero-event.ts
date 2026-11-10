import { webhookTrigger } from "../lib/triggers.ts";

/** Any email or user event Vero sends to its single notification address. */
const veroEvent = webhookTrigger({
  key: "vero-event",
  title: "Vero Event",
  description:
    "Fires on Vero webhook events: email sent, delivered, opened, clicked, failed, bounced, converted, unsubscribed, resubscribed and complained, and user created or updated. Pick event types with the events param or leave it empty for all. The run gets the event type and time, the user id and email, the campaign, the message id, bounce details, the opening or clicking client, the property and tag changes of a user update, and the full delivery.",
});

export default veroEvent;
