import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  customerId?: number;
  productId?: number;
}

export default listAction<Input>({
  key: "purchase-list",
  resource: "purchase",
  title: "List Purchases",
  description:
    "List purchases (orders), optionally for one contact and/or one product. Amounts are in " +
    "cents (`received_price_cents`, `received_total_cents`) alongside a `currency_code`.",
  path: "/purchases",
  itemsLabel: "Purchases",
  params: [
    {
      key: "customerId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only purchases made by this contact.",
    },
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only purchases of this product.",
    },
  ],
  query: (i) => ({ customer_id: i.customerId, product_id: i.productId }),
});
