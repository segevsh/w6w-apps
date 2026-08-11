import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_friends` — the current user's friends, with balances.
 *
 * This is the practical way to turn an email address into the `user_id` that
 * Create Expense's share list wants, which is why it is worth reaching for
 * before hand-writing an email/first_name/last_name triple into a share.
 *
 * > **Note**: `group` objects only include group balances with that friend.
 *
 * So each friend's `groups[].balance` is *that pair's* balance inside the
 * group, not the group's balances at large — and the top-level `balance` is the
 * overall figure across everything. Both are arrays of
 * `{currency_code, amount}` with `amount` a decimal string, because one
 * friendship can carry debts in several currencies at once.
 *
 * No pagination: the reference declares no `limit`, `offset` or cursor, so the
 * response is the whole list.
 */
const listFriends: ActionDefinition<Record<string, never>> = {
  key: "list-friends",
  type: "read",
  resource: "friend",
  title: "List Friends",
  description:
    "Every friend of the current user, with per-currency balances overall and per group. The " +
    "usual way to resolve an email address to a Splitwise user id.",
  params: [],
  output: [{ key: "friends", type: "array", label: "Friends" }],

  async execute(_input, ctx) {
    const body = await new SplitwiseClient(ctx).request("/get_friends");
    return { friends: pick<unknown[]>(body, "friends", []) };
  },
};

export default listFriends;
