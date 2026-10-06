import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, select, str } from "../lib/params.ts";

/**
 * `GET /rooms/{roomId}/murals` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  roomId: number;
  folderId?: string;
  status?: string;
  sortBy?: string;
  limit?: number;
  next?: string;
};

const roomMuralList: ActionDefinition<Input> = {
  key: "room-mural-list",
  type: "read",
  resource: "mural",
  title: "List Room Murals",
  description:
    "List the murals in a room, optionally within one folder. Needs the `murals:read` OAuth scope.",
  params: [
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
    str("folderId", "Folder ID"),
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
    return list(ctx, "GET", `/rooms/${encodeId(input.roomId)}/murals`, {
      query: pick(input, ["folderId", "status", "sortBy", "limit", "next"]),
    });
  },
};

export default roomMuralList;
