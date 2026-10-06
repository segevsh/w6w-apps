import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  productId: number;
}

export default contactAction<Input>({
  key: "contact-product-purchase",
  title: "Record Product Purchase",
  description:
    "Give a contact a product as if purchased, WITHOUT taking payment (Simplero: 'Purchase product without paying'). Use it to grant a product that was paid for elsewhere.",
  action: "product_purchase",
  idempotent: false,
  params: [
    contactIdParam,
    refParam("productId", "Product ID", "The product to grant, e.g. from List Products."),
  ],
  body: (i) => ({ product_id: i.productId }),
});
