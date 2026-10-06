import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/products` — List products, optionally filtered.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  internal_id?: string;
  product_code?: string;
  name?: string;
  with_disabled?: boolean;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List products, optionally filtered.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    { key: "internal_id", label: "Internal ID", type: "string", hint: "Internal id." },
    { key: "product_code", label: "Product code", type: "string", hint: "Product code." },
    { key: "name", label: "Name", type: "string", hint: "Name filter." },
    {
      key: "with_disabled",
      label: "Include disabled",
      type: "boolean",
      hint: "Include disabled products.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/products`, {
      query: {
        "internal_id": input.internal_id,
        "product_code": input.product_code,
        "name": input.name,
        "with_disabled": input.with_disabled,
      },
      page: input.page,
    });
  },
};

export default productList;
