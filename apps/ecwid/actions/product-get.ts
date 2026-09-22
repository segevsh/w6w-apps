import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { productIdParam, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /products/{productId}` — one product in full.
 *
 * Richer than what a search returns: the search projection omits things like
 * `costPrice`, `wholesalePrices` and the merchandising flags, while this answers
 * the whole product — including `combinations` (the variations a stock adjustment
 * has to address individually, since `PUT /products/{id}/inventory` only moves
 * the base product's stock).
 */
interface Input {
  productId: string;
  lang?: string;
  responseFields?: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product's full definition, including its variations and stock.",
  params: [
    productIdParam,
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      hint: "ISO 639-1 code for the translated fields (`nameTranslated`, `descriptionTranslated`).",
    },
    responseFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "price", type: "number", label: "Base price" },
    { key: "quantity", type: "number", label: "Stock on hand, when tracked" },
    { key: "unlimited", type: "boolean", label: "Whether stock is unlimited" },
    { key: "enabled", type: "boolean", label: "Whether the product is enabled" },
    { key: "categoryIds", type: "array", label: "Categories the product belongs to" },
    { key: "combinations", type: "array", label: "Variations" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/products/${encodeId(input.productId)}`, {
      query: { lang: input.lang, responseFields: input.responseFields },
    });
  },
};

export default productGet;
