import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `affiliate_commission_earned`. */
const commissionEarned = webhookTrigger({
  key: "commission-earned",
  title: "Affiliate Commission Earned",
  description:
    "Fires when an affiliate earns commission in ThriveCart (event affiliate_commission_earned). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "affiliate_commission_earned",
});

export default commissionEarned;
