import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/products` — Create a product.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  name: string;
  description?: string;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create product",
  description: "Create a product.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
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
      method: "POST",
      body: compact({ name: input.name, description: input.description }),
    });
  },
};

export default productCreate;
