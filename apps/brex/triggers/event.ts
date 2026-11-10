import { webhookTrigger } from "../lib/triggers.ts";

/** A Brex webhook event arrives (transfers, users, referrals, expense payments, accounting). */
const event = webhookTrigger({
  key: "event",
  title: "Brex Event",
  description:
    "Fires when Brex sends a webhook event you chose, such as TRANSFER_PROCESSED, TRANSFER_FAILED or USER_UPDATED. The run gets the event type, the delivery id and timestamp, the company id and the full event data.",
});

export default event;
