import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

/**
 * `GET /rooms/{roomId}/users` (Mural public API v1). OAuth scope: `users:read`.
 */
type Input = {
  roomId: number;
  limit?: number;
  next?: string;
};

const roomMemberList: ActionDefinition<Input> = {
  key: "room-member-list",
  type: "read",
  resource: "room",
  title: "List Room Members",
  description: "List the users who are members of a room. Needs the `users:read` OAuth scope.",
  params: [
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
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
    return list(ctx, "GET", `/rooms/${encodeId(input.roomId)}/users`, {
      query: pick(input, ["limit", "next"]),
    });
  },
};

export default roomMemberList;
