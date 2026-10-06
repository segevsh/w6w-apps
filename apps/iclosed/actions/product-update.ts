import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/products` — Update a product.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  productId: number;
  name?: string;
  description?: string;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update product",
  description: "Update a product.",
  idempotent: true,
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{product}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/products", {
      method: "PUT",
      body: compact({
        productId: input.productId,
        name: input.name,
        description: input.description,
      }),
    });
  },
};

export default productUpdate;
