import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-created",
  title: "Product Created",
  description: "Fires when a product is created. The run gets the event and the Product.",
  events: ["product.created"],
  sampleObject: { id: "prod_Oa1b2c", object: "product", name: "Gold Plan", active: true },
});

export default trigger;
