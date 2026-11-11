import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "dispute-won",
  title: "Dispute Won",
  resource: "dispute_won",
  subscription: false,
  description: "The run gets each sale dispute the seller wins.",
  sample: {
    "sale_id": "sale_1",
    "product_id": "prod_1",
    "product_name": "Pencil Icon PSD",
    "email": "buyer@example.test",
    "price": "100",
    "resource_name": "dispute_won",
  },
});
