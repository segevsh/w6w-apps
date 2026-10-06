import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";
import { cursorParam, PAGE_OUTPUT } from "../lib/params.ts";

interface Input {
  startTime: string;
  endTime: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /issues` — requires a time range of at most 365 days (RFC3339). Limit is 0-20000, default
 * 20000 (the most permissive page size in the API; rate limit 30 requests per minute).
 */
const issueList: ActionDefinition<Input> = {
  key: "issue-list",
  type: "search",
  resource: "issue",
  title: "List Issues",
  description:
    "List issues created within a time range of at most 365 days. Use Search Issues to filter by state, assignee, account or tag.",
  params: [
    {
      key: "startTime",
      label: "Start time",
      type: "datetime",
      required: true,
      hint: "RFC3339. The range between start and end may not exceed 365 days.",
    },
    { key: "endTime", label: "End time", type: "datetime", required: true, hint: "RFC3339." },
    cursorParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "0-20000; defaults to 20000 when omitted or 0.",
      validation: { min: 0, max: 20000, integer: true },
    },
  ],
  output: [{ key: "issues", type: "array", label: "Issues on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list("GET", "/issues", {
      query: {
        start_time: input.startTime,
        end_time: input.endTime,
        cursor: input.cursor,
        limit: input.limit,
      },
    });
    return { issues: items, ...page };
  },
};

export default issueList;
