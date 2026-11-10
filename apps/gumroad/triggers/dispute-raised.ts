import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "dispute-raised",
  title: "Dispute Raised",
  resource: "dispute",
  subscription: false,
  description: "The run gets each dispute raised against a Gumroad sale.",
  sample: {
    "sale_id": "sale_1",
    "product_id": "prod_1",
    "product_name": "Pencil Icon PSD",
    "email": "buyer@example.test",
    "price": "100",
    "resource_name": "dispute",
  },
});
