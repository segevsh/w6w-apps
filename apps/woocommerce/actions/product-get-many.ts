import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  search?: string;
  status?: string;
  type?: string;
  sku?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  minPrice?: string;
  maxPrice?: string;
  stockStatus?: string;
  orderBy?: string;
  order?: "asc" | "desc";
  after?: string;
  before?: string;
  perPage?: number;
  page?: number;
}

const productGetMany: ActionDefinition<Input> = {
  key: "product-get-many",
  type: "read",
  resource: "product",
  title: "List Products",
  description: "List products on a single page. Set `page` to walk further pages.",
  params: [
    { key: "search", label: "Search", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "private", label: "Private" },
        { value: "publish", label: "Publish" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "simple", label: "Simple" },
        { value: "grouped", label: "Grouped" },
        { value: "external", label: "External" },
        { value: "variable", label: "Variable" },
      ],
    },
    { key: "sku", label: "SKU", type: "string" },
    { key: "category", label: "Category ID", type: "string" },
    { key: "tag", label: "Tag ID", type: "string" },
    { key: "featured", label: "Featured", type: "boolean" },
    { key: "minPrice", label: "Min Price", type: "string" },
    { key: "maxPrice", label: "Max Price", type: "string" },
    {
      key: "stockStatus",
      label: "Stock Status",
      type: "select",
      options: [
        { value: "instock", label: "In Stock" },
        { value: "outofstock", label: "Out Of Stock" },
        { value: "onbackorder", label: "On Back Order" },
      ],
    },
    { key: "orderBy", label: "Order By", type: "string", default: "date" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "ASC" },
        { value: "desc", label: "DESC" },
      ],
      default: "desc",
    },
    { key: "after", label: "After (ISO8601)", type: "datetime" },
    { key: "before", label: "Before (ISO8601)", type: "datetime" },
    { key: "perPage", label: "Per Page", type: "number", default: 10 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "items", type: "array", label: "Products" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request("/products", {
      query: {
        search: input.search,
        status: input.status,
        type: input.type,
        sku: input.sku,
        category: input.category,
        tag: input.tag,
        featured: input.featured,
        min_price: input.minPrice,
        max_price: input.maxPrice,
        stock_status: input.stockStatus,
        orderby: input.orderBy,
        order: input.order,
        after: input.after,
        before: input.before,
        per_page: input.perPage ?? 10,
        page: input.page ?? 1,
      },
    });
  },
};

export default productGetMany;
