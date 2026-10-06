import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { PAGE_INFO, STATUS_FIELDS } from "../lib/fields.ts";

interface Input {
  first?: number;
  after?: string;
  type?: string;
}

const statusList: ActionDefinition<Input> = {
  key: "status-list",
  type: "search",
  resource: "status",
  title: "List Statuses",
  description: "List order statuses, optionally only quote or invoice statuses.",
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
      key: "type",
      label: "Type",
      type: "select",
      options: [{ label: "Quote", value: "QUOTE" }, { label: "Invoice", value: "INVOICE" }],
    },
  ],
  output: [
    { key: "nodes", type: "array", label: "Statuses" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ statuses: Parameters<typeof toPage>[0] }>(
      `query($first: Int, $after: String, $type: StatusType) { statuses(first: $first, after: $after, type: $type) { totalNodes ${PAGE_INFO} nodes { ${STATUS_FIELDS} } } }`,
      { first: input.first ?? DEFAULT_PAGE_SIZE, after: input.after, type: input.type },
    );
    return toPage(data.statuses);
  },
};

export default statusList;
