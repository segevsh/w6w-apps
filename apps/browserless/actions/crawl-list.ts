import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient } from "../lib/client.ts";

interface Input {
  status?: string;
  limit?: number;
  cursor?: string;
}

const crawlList: ActionDefinition<Input> = {
  key: "crawl-list",
  type: "read",
  resource: "crawl",
  title: "List Crawls",
  description: "List the account's crawl jobs, newest first, with status and progress counters.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["in-progress", "completed", "failed", "cancelled"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "1 to 100, default 20.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "`nextCursor` from the previous page.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Crawl summaries and nextCursor, as returned" }],

  async execute(input, ctx) {
    const data = await new BrowserlessClient(ctx).json("/crawl", {
      query: { status: input.status, limit: input.limit, cursor: input.cursor?.trim() },
    });
    return { data };
  },
};

export default crawlList;
