import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `cart_abandoned`. */
const cartAbandoned = webhookTrigger({
  key: "cart-abandoned",
  title: "Cart Abandoned",
  description:
    "Fires when a ThriveCart cart is abandoned (event cart_abandoned). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "cart_abandoned",
});

export default cartAbandoned;
