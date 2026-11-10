import { webhookTrigger } from "../lib/triggers.ts";

/**
 * A Brex `USER_UPDATED` webhook event arrives (a user's profile, status, manager, department,
 * location or title changed). Brex allows ONE webhook endpoint per client, so use this OR `event`.
 * https://developer.brex.com/guides/webhooks (verified 2026-11-10)
 */
export default webhookTrigger({
  key: "user-updated",
  title: "User Updated",
  description:
    "Fires when Brex sends a USER_UPDATED event. The run gets the event type, the delivery id and timestamp, the company id and the full event data.",
  fixedEvent: "USER_UPDATED",
});
