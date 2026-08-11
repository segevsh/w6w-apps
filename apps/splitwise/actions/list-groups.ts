import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_groups` — every group the current user belongs to.
 *
 * ## Group `0` is not a group
 *
 * > **Note**: Expenses that are not associated with a group are listed in a
 * > group with ID 0.
 *
 * So the list always contains a synthetic entry standing for "non-group
 * expenses" — the same `0` that Create Expense (by shares) accepts to file an
 * expense outside any group. It is returned here as Splitwise sends it, because
 * filtering it out would hide the only way to enumerate those expenses, but a
 * workflow that iterates groups to, say, add a member must skip it.
 *
 * ## Balances are per currency, and they are strings
 *
 * Each member carries `balance: [{currency_code, amount}]` — an array, not a
 * number, because one group can hold debts in several currencies at once, and
 * `amount` is a decimal string. Summing them numerically across currencies
 * produces a meaningless figure.
 *
 * `original_debts` and `simplified_debts` are both returned. They differ
 * whenever the group has debt simplification on: the first is who actually owes
 * whom per expense, the second is the netted set Splitwise displays.
 *
 * There is no pagination on this endpoint — no `limit`, no `offset`, no cursor
 * in the reference — so the response is the whole list every time.
 */
const listGroups: ActionDefinition<Record<string, never>> = {
  key: "list-groups",
  type: "read",
  resource: "group",
  title: "List Groups",
  description:
    "Every group the current user belongs to, including the synthetic group 0 that holds " +
    "expenses belonging to no group.",
  params: [],
  output: [{ key: "groups", type: "array", label: "Groups" }],

  async execute(_input, ctx) {
    const body = await new SplitwiseClient(ctx).request("/get_groups");
    return { groups: pick<unknown[]>(body, "groups", []) };
  },
};

export default listGroups;
