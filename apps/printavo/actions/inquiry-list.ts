import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, PrintavoClient, toPage } from "../lib/client.ts";
import { INQUIRY_FIELDS, PAGE_INFO } from "../lib/fields.ts";

interface Input {
  first?: number;
  after?: string;
}

const inquiryList: ActionDefinition<Input> = {
  key: "inquiry-list",
  type: "search",
  resource: "inquiry",
  title: "List Inquiries",
  description: "List customer inquiries (quote requests).",
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
  ],
  output: [
    { key: "nodes", type: "array", label: "Inquiries" },
    { key: "totalNodes", type: "number", label: "Total Matching" },
    { key: "hasNextPage", type: "boolean", label: "More Pages" },
    { key: "endCursor", type: "string", label: "Next Cursor" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ inquiries: Parameters<typeof toPage>[0] }>(
      `query($first: Int, $after: String) { inquiries(first: $first, after: $after) { totalNodes ${PAGE_INFO} nodes { ${INQUIRY_FIELDS} } } }`,
      {
        first: input.first ?? DEFAULT_PAGE_SIZE,
        after: input.after,
      },
    );
    return toPage(data.inquiries);
  },
};

export default inquiryList;
