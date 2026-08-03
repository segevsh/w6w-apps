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
  search?: string;
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
}

/** `POST /ecom/v1/orders/search` — handler `wix.ecom.v1.order:SearchOrders`. */
const searchOrders: ActionDefinition<Input> = {
  key: "search-orders",
  type: "search",
  resource: "order",
  title: "Search Orders",
  description:
    "Search the site's eCommerce orders by filter, free text, sort and cursor paging. Wix exposes no offset-paged list for orders — this is the read path.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'Wix API Query Language, e.g. `{"paymentStatus": {"$eq": "PAID"}}` or `{"status": {"$ne": "CANCELED"}}`.',
    },
    {
      key: "search",
      label: "Free-text search",
      type: "string",
      hint: "Matches across buyer name, email and order number.",
    },
    {
      key: "sortFieldName",
      label: "Sort field",
      type: "string",
      hint: "e.g. `createdDate`, `number`.",
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
    ...CURSOR_PAGE_PARAMS,
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    const sort = input.sortFieldName
      ? [{ fieldName: input.sortFieldName, order: input.sortOrder ?? "ASC" }]
      : undefined;

    return new WixClient(ctx).request("/ecom/v1/orders/search", {
      method: "POST",
      body: {
        search: compact({
          filter: input.filter,
          search: input.search ? { expression: input.search } : undefined,
          sort,
          cursorPaging: cursorPaging(input),
        }),
      },
    });
  },
};

export default searchOrders;
