import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "charge-captured",
  title: "Charge Captured",
  description:
    "Fires when a previously authorised charge is captured. The run gets the event and the Charge.",
  events: ["charge.captured"],
  sampleObject: {
    id: "ch_3Nq0Za",
    object: "charge",
    status: "succeeded",
    captured: true,
    amount: 2000,
    amount_captured: 2000,
    currency: "usd",
  },
});

export default trigger;
