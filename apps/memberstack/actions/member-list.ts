import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";

/**
 * `GET /members` — one page of members. `limit` (alias `first`, which wins if both are sent)
 * defaults to 50 and is capped at 100. Pass the previous page's `endCursor` as `after`.
 */
interface Input {
  limit?: number;
  after?: number;
  order?: "ASC" | "DESC";
  includeJSON?: boolean;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "List members, 100 per page at most, with cursor pagination.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
      hint: "Members per page (default 50, max 100).",
    },
    {
      key: "after",
      label: "After cursor",
      type: "number",
      hint: "The endCursor of the previous page.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "ASC",
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
    {
      key: "includeJSON",
      label: "Include member JSON",
      type: "boolean",
      default: false,
      hint: "Include each member's json field (omitted by default for performance).",
    },
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
    { key: "totalCount", type: "number", label: "Total members" },
    { key: "endCursor", type: "number", label: "Cursor for the next page" },
    { key: "hasNextPage", type: "boolean", label: "More pages exist" },
  ],

  async execute(input, ctx) {
    const body = await new MemberstackClient(ctx).json<{
      data?: unknown[];
      totalCount?: number;
      endCursor?: number;
      hasNextPage?: boolean;
    }>("/members", {
      query: {
        limit: input.limit,
        after: input.after,
        order: input.order,
        includeJSON: input.includeJSON ? "true" : undefined,
      },
    });
    return {
      members: body?.data ?? [],
      totalCount: body?.totalCount,
      endCursor: body?.endCursor,
      hasNextPage: body?.hasNextPage ?? false,
    };
  },
};

export default memberList;
