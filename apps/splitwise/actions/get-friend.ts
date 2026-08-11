import type { ActionDefinition } from "@w6w/types";
import { encodeId, pick, SplitwiseClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/**
 * `GET /get_friend/{id}` — one friendship, with balances.
 *
 * The `{id}` here is the **friend's user id**, not a friendship id — the same
 * number that appears as `user_id` in an expense share and as `id` in the
 * friend list. (Expenses carry a separate `friendship_id`, which is not what
 * this endpoint takes.)
 */
interface Input {
  userId: number;
}

const getFriend: ActionDefinition<Input> = {
  key: "get-friend",
  type: "read",
  resource: "friend",
  title: "Get Friend",
  description: "Fetch one friend by their user id, with overall and per-group balances.",
  params: [
    {
      ...userIdParam,
      hint: "The friend's **user** id, from List Friends — not the `friendship_id` on an expense.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "balance", type: "array", label: "Overall balance, per currency" },
    { key: "groups", type: "array", label: "Per-group balances with this friend" },
  ],

  async execute(input, ctx) {
    const body = await new SplitwiseClient(ctx).request(
      `/get_friend/${encodeId(input.userId, "userId")}`,
    );
    return pick<Record<string, unknown>>(body, "friend", {});
  },
};

export default getFriend;
