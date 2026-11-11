import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "sale-refunded",
  title: "Sale Refunded",
  resource: "refund",
  subscription: false,
  description: "The run gets each Gumroad sale that is refunded.",
  sample: {
    "sale_id": "sale_1",
    "product_id": "prod_1",
    "product_name": "Pencil Icon PSD",
    "email": "buyer@example.test",
    "price": "100",
    "resource_name": "refund",
  },
});
