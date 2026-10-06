import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  productId: number;
}

export default contactAction<Input>({
  key: "contact-product-cancel",
  title: "Cancel Product Purchase",
  description: "Cancel a contact's existing purchase of a product.",
  action: "product_cancel",
  idempotent: false,
  params: [
    contactIdParam,
    refParam("productId", "Product ID", "The product whose purchase to cancel."),
  ],
  body: (i) => ({ product_id: i.productId }),
});
