import type { ActionDefinition } from "@w6w/types";
import { cursorOf, LoopClient } from "../lib/client.ts";

/**
 * List Returns.
 *
 * `GET /warehouse/return/list` with `paginate=true` always set, so the response is the cursor envelope `{returns, nextPageUrl, previousPageUrl}` rather than a bare array. With neither `from` nor `to` Loop returns only the previous 24 hours; the window may span at most 120 days; without `state` it returns open, closed and expired returns (not cancelled or in-review ones).
 */
interface Input {
  from?: string;
  to?: string;
  filter?: string;
  state?: string;
  pageSize?: number;
  cursor?: string;
}

const action: ActionDefinition<Input> = {
  key: "return-list",
  type: "read",
  resource: "return",
  title: "List Returns",
  description:
    "List returns created (or updated) in a time window, newest page first, with cursor pagination.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      hint:
        "Window start, `yyyy-mm-dd hh:mm:ss`. `from` alone means the 24 hours after it; `to` alone is ignored.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "Window end, `yyyy-mm-dd hh:mm:ss`. Max 120 days after `from`.",
    },
    {
      key: "filter",
      label: "Filter by date",
      type: "select",
      hint: "Which timestamp from/to applies to. Default created_at.",
      options: [{ value: "created_at", label: "Created at" }, {
        value: "updated_at",
        label: "Updated at",
      }],
    },
    {
      key: "state",
      label: "State",
      type: "select",
      hint: "Only returns in this state. Default: open, closed and expired.",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "expired", label: "Expired" },
        { value: "review", label: "In review" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Returns per page, 1–750. Prefilled at 25; Loop's default is 100.",
      default: 25,
      validation: { integer: true, min: 1, max: 750 },
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint:
        "Pass the previous page's `nextCursor` to fetch the next page. Omit for the first page.",
    },
  ],
  output: [
    { key: "returns", type: "array", label: "Returns on this page" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, null on the last" },
    { key: "nextPageUrl", type: "string", label: "Loop's next-page URL" },
    { key: "previousPageUrl", type: "string", label: "Loop's previous-page URL" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get("/warehouse/return/list", {
      from: input.from,
      to: input.to,
      filter: input.filter,
      state: input.state,
      paginate: true,
      pageSize: input.pageSize ?? 25,
      cursor: input.cursor,
    });
    const page = (Array.isArray(res) ? { returns: res } : res) as Record<string, unknown>;
    const next = (page.nextPageUrl ?? null) as string | null;
    return {
      returns: page.returns ?? [],
      nextCursor: cursorOf(next),
      nextPageUrl: next,
      previousPageUrl: (page.previousPageUrl ?? null) as string | null,
    };
  },
};

export default action;
