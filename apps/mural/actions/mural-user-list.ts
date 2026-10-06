import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

/**
 * `GET /murals/{muralId}/users` (Mural public API v1). OAuth scope: `users:read`.
 */
type Input = {
  muralId: string;
  limit?: number;
  next?: string;
};

const muralUserList: ActionDefinition<Input> = {
  key: "mural-user-list",
  type: "read",
  resource: "mural",
  title: "List Mural Users",
  description: "List the users who have access to a mural. Needs the `users:read` OAuth scope.",
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
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
    return list(ctx, "GET", `/murals/${encodeId(input.muralId)}/users`, {
      query: pick(input, ["limit", "next"]),
    });
  },
};

export default muralUserList;
