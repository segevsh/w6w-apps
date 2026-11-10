import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "price-created",
  title: "Price Created",
  description: "Fires when a price is created. The run gets the event and the Price.",
  events: ["price.created"],
  sampleObject: {
    id: "price_1Nq0Za",
    object: "price",
    product: "prod_Oa1b2c",
    unit_amount: 2000,
    currency: "usd",
  },
});

export default trigger;
