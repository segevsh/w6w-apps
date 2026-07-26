import type { ActionDefinition } from "@w6w/types";
import { type Paged, ShopifyClient, unset } from "../lib/client.ts";
import { pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  status?: string;
  vendor?: string;
  productType?: string;
  updatedAtMin?: string;
  limit?: number;
  pageInfo?: string;
}

const productGetMany: ActionDefinition<Input, Paged<unknown>> = {
  key: "product-get-many",
  type: "search",
  resource: "product",
  title: "List Products",
  description:
    "List products. Follow `nextPageInfo` for the next page — Shopify paginates with a Link header.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ],
    },
    { key: "vendor", label: "Vendor", type: "string", row: "class" },
    { key: "productType", label: "Product type", type: "string", row: "class" },
    { key: "updatedAtMin", label: "Updated since", type: "datetime", hint: "ISO 8601 timestamp." },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    // Once a cursor is in play Shopify rejects the filters — the cursor carries
    // them already — so they are dropped rather than sent alongside it.
    const cursor = unset(input.pageInfo);
    return new ShopifyClient(ctx).list<unknown>("/products.json", "products", {
      limit: input.limit,
      page_info: cursor,
      status: cursor ? undefined : unset(input.status),
      vendor: cursor ? undefined : unset(input.vendor),
      product_type: cursor ? undefined : unset(input.productType),
      updated_at_min: cursor ? undefined : unset(input.updatedAtMin),
    });
  },
};

export default productGetMany;
