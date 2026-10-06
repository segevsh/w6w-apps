import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { PAGE_INFO, PRODUCT_FIELDS } from "../lib/fields.ts";

interface Input {
  query: string;
  first?: number;
  after?: string;
}

const productSearch: ActionDefinition<Input> = {
  key: "product-search",
  type: "search",
  resource: "product",
  title: "Search Products",
  description: "Search the product catalog by term (products; the query is required by the API).",
  params: [
    { key: "query", label: "Search Term", type: "string", required: true },
    {
      key: "first",
      label: "Page Size",
      type: "number",
      hint: "Items per page (default 25).",
      default: 25,
    },
    { key: "after", label: "After Cursor", type: "string" },
  ],
  output: [
    { key: "nodes", type: "array", label: "Products" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ products: Parameters<typeof toPage>[0] }>(
      `query($query: String!, $first: Int, $after: String) { products(query: $query, first: $first, after: $after) { totalNodes ${PAGE_INFO} nodes { ${PRODUCT_FIELDS} } } }`,
      { query: input.query, first: input.first ?? DEFAULT_PAGE_SIZE, after: input.after },
    );
    return toPage(data.products);
  },
};

export default productSearch;
