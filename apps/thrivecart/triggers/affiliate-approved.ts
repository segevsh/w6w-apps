import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `affiliate_approved`. */
const affiliateApproved = webhookTrigger({
  key: "affiliate-approved",
  title: "Affiliate Approved",
  description:
    "Fires when an affiliate is approved for a product in ThriveCart (event affiliate_approved). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "affiliate_approved",
});

export default affiliateApproved;
