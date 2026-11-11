import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "price-updated",
  title: "Price Updated",
  description:
    "Fires when a price is updated. The run gets the event and the Price after the change, and previousAttributes holds the old values.",
  events: ["price.updated"],
  sampleObject: {
    id: "price_1Nq0Za",
    object: "price",
    product: "prod_Oa1b2c",
    unit_amount: 2000,
    currency: "usd",
  },
});

export default trigger;
