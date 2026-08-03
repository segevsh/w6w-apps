import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  CURSOR_PAGE_PARAMS,
  type CursorPageInput,
  cursorPaging,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends CursorPageInput {
  filter?: Record<string, unknown>;
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
  fields?: string;
}

/** `POST /stores/v3/products/query` — handler `wix.stores.catalog.v3.product:QueryProducts`. */
const queryProducts: ActionDefinition<Input> = {
  key: "query-products",
  type: "search",
  resource: "product",
  title: "Query Products",
  description:
    "Query the Wix Stores catalog (Catalog V3). Cursor-paged — pass the previous response's `pagingMetadata.cursors.next` to continue.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'Wix API Query Language, e.g. `{"visible": {"$eq": true}}` or `{"id": {"$in": ["…"]}}`.',
    },
    {
      key: "sortFieldName",
      label: "Sort field",
      type: "string",
      hint: "e.g. `createdDate`, `name`.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        "Comma-separated extra field sets to include, e.g. `CURRENCY`, `INFO_SECTION`, `VARIANT_OPTION_CHOICE_NAMES`.",
    },
    ...CURSOR_PAGE_PARAMS,
  ],
  output: [
    { key: "products", type: "array", label: "Products" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    const sort = input.sortFieldName
      ? [{ fieldName: input.sortFieldName, order: input.sortOrder ?? "ASC" }]
      : undefined;
    const fields = input.fields
      ? input.fields.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    return new WixClient(ctx).request("/stores/v3/products/query", {
      method: "POST",
      body: compact({
        query: compact({
          filter: input.filter,
          sort,
          cursorPaging: cursorPaging(input),
        }),
        fields,
      }),
    });
  },
};

export default queryProducts;
