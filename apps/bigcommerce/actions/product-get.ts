import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId, toList } from "../lib/client.ts";
import {
  type FieldSelectionInput,
  fieldSelectionParams,
  fieldSelectionQuery,
  productIdParam,
  productIncludeOptions,
} from "../lib/params.ts";

/** `GET /v3/catalog/products/{product_id}` — one product. */
interface Input extends FieldSelectionInput {
  productId: number;
  include?: string[];
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch a single product by ID, optionally with its variants, images or options.",
  params: [
    productIdParam,
    {
      key: "include",
      label: "Include sub-resources",
      type: "multiselect",
      options: productIncludeOptions,
    },
    ...fieldSelectionParams(),
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    {
      key: "name",
      type: "string",
      label: "Name",
    },
    { key: "sku", type: "string", label: "SKU" },
    {
      key: "price",
      type: "number",
      label: "Price",
    },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3(`/catalog/products/${encodeId(input.productId)}`, {
      query: { include: toList(input.include), ...fieldSelectionQuery(input) },
    });
  },
};

export default productGet;
