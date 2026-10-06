import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}/rooms` (Mural public API v1). OAuth scope: `rooms:read`.
 */
type Input = {
  workspaceId: string;
  limit?: number;
  next?: string;
};

const roomList: ActionDefinition<Input> = {
  key: "room-list",
  type: "read",
  resource: "room",
  title: "List Workspace Rooms",
  description: "List the rooms in a workspace. Needs the `rooms:read` OAuth scope.",
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
    return list(ctx, "GET", `/workspaces/${encodeId(input.workspaceId)}/rooms`, {
      query: pick(input, ["limit", "next"]),
    });
  },
};

export default roomList;
