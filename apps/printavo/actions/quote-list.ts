import type { ActionDefinition } from "@w6w/types";
import { csv, DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { ORDER_FIELDS, PAGE_INFO } from "../lib/fields.ts";

interface Input {
  first?: number;
  after?: string;
  query?: string;
  statusIds?: string;
  excludeStatusIds?: string;
  paymentStatus?: string;
  tags?: string;
  inProductionAfter?: string;
  inProductionBefore?: string;
  sortOn?: string;
  sortDescending?: boolean;
}

const quoteList: ActionDefinition<Input> = {
  key: "quote-list",
  type: "search",
  resource: "quote",
  title: "List Quotes",
  description: "List quotes with optional status, payment, tag, date and sort filters.",
  params: [
    {
      key: "first",
      label: "Page Size",
      type: "number",
      hint: "Items per page (default 25).",
      default: 25,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "endCursor from a previous call.",
    },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Free-text search; tags are ignored when it is set.",
    },
    {
      key: "statusIds",
      label: "Status IDs",
      type: "string",
      hint: "Comma-separated status IDs to include.",
    },
    {
      key: "excludeStatusIds",
      label: "Exclude Status IDs",
      type: "string",
      hint: "Comma-separated status IDs to exclude.",
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      type: "select",
      options: [{ label: "Paid", value: "PAID" }, {
        label: "Partial payment",
        value: "PARTIAL_PAYMENT",
      }, { label: "Unpaid", value: "UNPAID" }],
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tags; matches any." },
    {
      key: "inProductionAfter",
      label: "In Production After",
      type: "string",
      hint: "ISO 8601 datetime (due date after this).",
    },
    {
      key: "inProductionBefore",
      label: "In Production Before",
      type: "string",
      hint: "ISO 8601 datetime (start date before this).",
    },
    {
      key: "sortOn",
      label: "Sort On",
      type: "select",
      options: [
        { label: "Customer due date", value: "CUSTOMER_DUE_AT" },
        { label: "Customer name", value: "CUSTOMER_NAME" },
        { label: "Owner", value: "OWNER" },
        { label: "Status", value: "STATUS" },
        { label: "Total", value: "TOTAL" },
        { label: "Visual ID", value: "VISUAL_ID" },
      ],
    },
    { key: "sortDescending", label: "Sort Descending", type: "boolean" },
  ],
  output: [
    { key: "nodes", type: "array", label: "Quotes" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ quotes: Parameters<typeof toPage>[0] }>(
      `query($first: Int, $after: String, $query: String, $statusIds: [ID!], $excludeStatusIds: [ID!], $paymentStatus: OrderPaymentStatus, $tags: [String!], $inProductionAfter: ISO8601DateTime, $inProductionBefore: ISO8601DateTime, $sortOn: OrderSortField, $sortDescending: Boolean) { quotes(first: $first, after: $after, query: $query, statusIds: $statusIds, excludeStatusIds: $excludeStatusIds, paymentStatus: $paymentStatus, tags: $tags, inProductionAfter: $inProductionAfter, inProductionBefore: $inProductionBefore, sortOn: $sortOn, sortDescending: $sortDescending) { totalNodes ${PAGE_INFO} nodes { ${ORDER_FIELDS} } } }`,
      {
        first: input.first ?? DEFAULT_PAGE_SIZE,
        after: input.after,
        query: input.query,
        statusIds: csv(input.statusIds),
        excludeStatusIds: csv(input.excludeStatusIds),
        paymentStatus: input.paymentStatus,
        tags: csv(input.tags),
        inProductionAfter: input.inProductionAfter,
        inProductionBefore: input.inProductionBefore,
        sortOn: input.sortOn,
        sortDescending: input.sortDescending,
      },
    );
    return toPage(data.quotes);
  },
};

export default quoteList;
