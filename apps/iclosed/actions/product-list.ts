import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/products` — List products.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  search?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderColumn?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List products",
  description: "List products.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive name search.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page (maximum 200). Vendor default 20.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "orderBy",
      label: "Order direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      hint: "Required together with Order column.",
    },
    {
      key: "orderColumn",
      label: "Order column",
      type: "select",
      options: [
        { value: "id", label: "id" },
        { value: "name", label: "name" },
        { value: "createdAt", label: "createdAt" },
        { value: "updatedAt", label: "updatedAt" },
        { value: "deals", label: "deals" },
      ],
    },
  ],
  output: [
    { key: "data", type: "object", label: "{count, products[]}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/products", {
      query: {
        search: input.search,
        limit: input.limit,
        page: input.page,
        orderBy: input.orderBy,
        orderColumn: input.orderColumn,
      },
    });
  },
};

export default productList;
