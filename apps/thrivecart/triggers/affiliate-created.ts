import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `affiliate_created`. */
const affiliateCreated = webhookTrigger({
  key: "affiliate-created",
  title: "Affiliate Created",
  description:
    "Fires when a new affiliate is created in ThriveCart (event affiliate_created). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "affiliate_created",
});

export default affiliateCreated;
