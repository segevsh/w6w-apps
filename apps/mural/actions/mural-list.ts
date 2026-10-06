import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, select, str } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/murals` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  workspaceId: string;
  status?: string;
  sortBy?: string;
  limit?: number;
  next?: string;
};

const muralList: ActionDefinition<Input> = {
  key: "mural-list",
  type: "read",
  resource: "mural",
  title: "List Workspace Murals",
  description: "List the murals in a workspace. Needs the `murals:read` OAuth scope.",
  params: [
    str("workspaceId", "Workspace ID", {
      required: true,
      hint: "The workspace ID, e.g. from List Workspaces.",
    }),
    select("status", "Status", ["active", "archived"]),
    select("sortBy", "Sort by", ["lastCreated", "lastModified", "oldest"]),
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
    return list(ctx, "GET", `/workspaces/${encodeId(input.workspaceId)}/murals`, {
      query: pick(input, ["status", "sortBy", "limit", "next"]),
    });
  },
};

export default muralList;
