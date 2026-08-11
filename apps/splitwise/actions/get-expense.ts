import type { ActionDefinition } from "@w6w/types";
import { encodeId, pick, SplitwiseClient } from "../lib/client.ts";
import { expenseIdParam } from "../lib/params.ts";

/**
 * `GET /get_expense/{id}` — one expense in full.
 *
 * The three fields worth understanding before you write one back:
 *
 *  - **`users`** — the share list, one entry per participant, each with
 *    `paid_share`, `owed_share` and a derived `net_balance` (paid minus owed).
 *    This is the shape Create Expense (by shares) and Update Expense take as
 *    input, minus `net_balance`, which Splitwise computes.
 *  - **`repayments`** — the settlement Splitwise derived from those shares:
 *    `{from, to, amount}` triples saying who should pay whom. Read this, do not
 *    recompute it.
 *  - **`group_id`** — nullable. An expense outside any group has `null` here,
 *    while the same expense is created by *sending* `group_id: 0`. The two
 *    spellings of "no group" do not match, which is a real source of round-trip
 *    bugs.
 *
 * A deleted expense is still readable and carries `deleted_at` / `deleted_by`
 * rather than 404ing.
 */
interface Input {
  expenseId: number;
}

const getExpense: ActionDefinition<Input> = {
  key: "get-expense",
  type: "read",
  resource: "expense",
  title: "Get Expense",
  description: "Fetch one expense with its shares, derived repayments and comments.",
  params: [expenseIdParam],
  output: [
    { key: "id", type: "number", label: "Expense ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "cost", type: "string", label: "Total cost, as a decimal string" },
    { key: "currency_code", type: "string", label: "Currency" },
    { key: "group_id", type: "number", label: "Group ID — null when outside a group" },
    { key: "users", type: "array", label: "Shares: paid, owed and net per user" },
    { key: "repayments", type: "array", label: "Derived settlement: from, to, amount" },
    { key: "date", type: "string", label: "When the expense took place" },
    { key: "deleted_at", type: "string", label: "Set when the expense is deleted" },
  ],

  async execute(input, ctx) {
    const body = await new SplitwiseClient(ctx).request(
      `/get_expense/${encodeId(input.expenseId, "expenseId")}`,
    );
    return pick<Record<string, unknown>>(body, "expense", {});
  },
};

export default getExpense;
