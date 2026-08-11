import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";
import { expenseCommonBody, type ExpenseCommonInput, expenseCommonParams } from "../lib/params.ts";
import {
  allowUnbalancedParam,
  buildShareFields,
  type ShareInput,
  sharesParam,
} from "../lib/shares.ts";

/**
 * `POST /create_expense`, the **by-shares** form — the full expense model.
 *
 * ## What a share is
 *
 * One entry per participating user, each carrying two independent amounts:
 *
 *  - `paid_share` — what that user actually put in.
 *  - `owed_share` — what that user is on the hook for.
 *
 * Both columns must total the expense `cost`. A $25 brunch that one person paid
 * for and two people split is `paid = [25, 0]`, `owed = [13.55, 11.45]`; the
 * difference per user is the debt Splitwise records, and it publishes the
 * resulting settlement back as `repayments`. That two-column form is what makes
 * "three people paid parts of a bill four people ate" expressible at all, which
 * the equal-split form cannot do.
 *
 * `lib/shares.ts` owns the translation to Splitwise's flattened
 * `users__{index}__{property}` wire form, the identity rules, and the balance
 * check — read its module doc for the full account, including exactly what is
 * and is not documented about unbalanced shares.
 *
 * ## `group_id: 0` is legal here, and only here
 *
 * > The group to put this expense in, **or `0` to create an expense outside of
 * > a group.**
 *
 * So 0 is a real value on the way in — but an expense created that way comes
 * back with `group_id: null`, not 0. The two spellings of "no group" do not
 * round-trip, which is worth knowing before comparing a written expense to a
 * read one. `group_id` is required by the schema even when it is 0.
 *
 * ## Not idempotent
 *
 * No endpoint in this API takes an idempotency key. Two identical calls create
 * two identical expenses and both count against everyone's balance.
 */
interface Input extends ExpenseCommonInput {
  group_id: number;
  description: string;
  cost: string;
  users: ShareInput[];
  allowUnbalancedShares?: boolean;
}

const createExpenseByShares: ActionDefinition<Input> = {
  key: "create-expense-by-shares",
  type: "perform",
  resource: "expense",
  title: "Create Expense (By Shares)",
  description:
    "Create an expense with an explicit per-user split: who paid what, and who owes what. Both " +
    "columns must total the cost.",
  idempotent: false,
  params: [
    {
      key: "group_id",
      label: "Group ID",
      type: "number",
      required: true,
      default: 0,
      validation: { integer: true, min: 0 },
      hint:
        "The group this expense belongs to, or `0` for an expense outside any group. Splitwise " +
        "requires the field either way — and note an expense created with `0` reads back with " +
        "`group_id: null`.",
    },
    ...expenseCommonParams(true),
    sharesParam,
    allowUnbalancedParam,
  ],
  output: [
    { key: "id", type: "number", label: "Expense ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "cost", type: "string", label: "Total cost" },
    { key: "group_id", type: "number", label: "Group ID — null when created with 0" },
    { key: "users", type: "array", label: "Shares, with net_balance per user" },
    { key: "repayments", type: "array", label: "Derived settlement: from, to, amount" },
  ],

  async execute(input, ctx) {
    const groupId = Number(input.group_id ?? 0);
    if (!Number.isInteger(groupId) || groupId < 0) {
      throw new Error(
        `group_id must be a non-negative integer (0 for no group), got "${String(input.group_id)}"`,
      );
    }

    const body: Record<string, unknown> = {
      group_id: groupId,
      ...expenseCommonBody(input),
      ...buildShareFields(input.users, input.cost, input.allowUnbalancedShares),
    };

    ctx.log("info", "creating a Splitwise expense from explicit shares", {
      group_id: groupId,
      cost: input.cost,
      shares: Array.isArray(input.users) ? input.users.length : undefined,
    });
    const res = await new SplitwiseClient(ctx).request("/create_expense", {
      method: "POST",
      body,
    });
    const expenses = pick<Record<string, unknown>[]>(res, "expenses", []);
    return expenses[0] ?? {};
  },
};

export default createExpenseByShares;
