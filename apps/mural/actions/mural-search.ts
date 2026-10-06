import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

/**
 * `GET /search/{workspaceId}/murals` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  workspaceId: string;
  q: string;
  roomId?: number;
  limit?: number;
  next?: string;
};

const muralSearch: ActionDefinition<Input> = {
  key: "mural-search",
  type: "search",
  resource: "mural",
  title: "Search Murals",
  description:
    "Search a workspace's murals by text, optionally within one room. Needs the `murals:read` OAuth scope.",
  params: [
    str("workspaceId", "Workspace ID", {
      required: true,
      hint: "The workspace ID, e.g. from List Workspaces.",
    }),
    str("q", "Search text", { required: true }),
    int("roomId", "Room ID"),
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
    return list(ctx, "GET", `/search/${encodeId(input.workspaceId)}/murals`, {
      query: pick(input, ["q", "roomId", "limit", "next"]),
    });
  },
};

export default muralSearch;
