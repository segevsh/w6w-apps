import { webhookTrigger } from "../lib/triggers.ts";

/** Any one ThriveCart event, chosen with the `event` param (`*` for all). */
const thrivecartEvent = webhookTrigger({
  key: "thrivecart-event",
  title: "ThriveCart Event",
  description:
    "Fires on one ThriveCart event of your choice, or on all of them with *: purchases, bumps, upsells, downsells, refunds, rebills, cancellations, pauses, abandoned carts and affiliate events. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
});

export default thrivecartEvent;
