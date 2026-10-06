import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { PAGE_INFO } from "../lib/fields.ts";

interface Input {
  first?: number;
  after?: string;
  status?: string;
  sortDescending?: boolean;
}

const paymentRequestList: ActionDefinition<Input> = {
  key: "payment-request-list",
  type: "search",
  resource: "payment-request",
  title: "List Payment Requests",
  description: "List open (or closed/archived) payment requests.",
  params: [
    {
      key: "first",
      label: "Page Size",
      type: "number",
      hint: "Items per page (default 25).",
      default: 25,
    },
    { key: "after", label: "After Cursor", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ label: "Open", value: "OPEN" }, { label: "Closed", value: "CLOSED" }, {
        label: "Archived",
        value: "ARCHIVED",
      }],
    },
    { key: "sortDescending", label: "Sort Descending", type: "boolean" },
  ],
  output: [
    { key: "nodes", type: "array", label: "Payment Requests" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ paymentRequests: Parameters<typeof toPage>[0] }>(
      `query($first: Int, $after: String, $status: PaymentRequestStatus, $sortDescending: Boolean) { paymentRequests(first: $first, after: $after, status: $status, sortDescending: $sortDescending) { totalNodes ${PAGE_INFO} nodes { id amount status } } }`,
      {
        first: input.first ?? DEFAULT_PAGE_SIZE,
        after: input.after,
        status: input.status,
        sortDescending: input.sortDescending,
      },
    );
    return toPage(data.paymentRequests);
  },
};

export default paymentRequestList;
