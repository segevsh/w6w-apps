import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payout-item-succeeded",
  title: "Payout Item Succeeded",
  description:
    "Fires when a payout item is paid out. The run gets the event and the payout item with its transaction id.",
  eventTypes: ["PAYMENT.PAYOUTS-ITEM.SUCCEEDED"],
  sampleResource: { payout_item_id: "8AELMXH8UB2P8", transaction_status: "SUCCESS" },
});

export default trigger;
