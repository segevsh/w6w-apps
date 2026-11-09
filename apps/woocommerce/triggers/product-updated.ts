import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-updated",
  title: "Product Updated",
  description: "Fires when a product changes. The run gets the product as it is now.",
  topics: ["product.updated"],
  samplePayload: { id: 794, name: "Premium Quality", status: "publish", price: "19.99" },
});

export default trigger;
