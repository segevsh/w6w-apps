import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-updated",
  title: "Product Updated",
  description:
    "Fires when a product is updated. The run gets the event and the Product after the change, and previousAttributes holds the old values.",
  events: ["product.updated"],
  sampleObject: { id: "prod_Oa1b2c", object: "product", name: "Gold Plan", active: true },
});

export default trigger;
