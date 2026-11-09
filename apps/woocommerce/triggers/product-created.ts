import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "product-created",
  title: "Product Created",
  description:
    "Fires when a product is created. The run gets the product: name, price, stock and categories.",
  topics: ["product.created"],
  samplePayload: { id: 794, name: "Premium Quality", status: "publish", price: "21.99" },
});

export default trigger;
