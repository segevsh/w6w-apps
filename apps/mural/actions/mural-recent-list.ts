import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/murals/recent` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  workspaceId: string;
  limit?: number;
  next?: string;
};

const muralRecentList: ActionDefinition<Input> = {
  key: "mural-recent-list",
  type: "read",
  resource: "mural",
  title: "List Recent Murals",
  description:
    "List the murals the user opened recently in a workspace. Needs the `murals:read` OAuth scope.",
  params: [
    str("workspaceId", "Workspace ID", {
      required: true,
      hint: "The workspace ID, e.g. from List Workspaces.",
    }),
    int("limit", "Limit", {
      hint: "Maximum results per page (the vendor rejects values of 100 or more).",
    }),
    str("next", "Next page token", {
      hint: "The `next` token from the previous page. Tokens expire (NEXT_TOKEN_EXPIRED).",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "The page of results" },
    { key: "next", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  execute(input, ctx) {
    return list(ctx, "GET", `/workspaces/${encodeId(input.workspaceId)}/murals/recent`, {
      query: pick(input, ["limit", "next"]),
    });
  },
};

export default muralRecentList;
