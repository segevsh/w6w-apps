import type { ActionDefinition } from "@w6w/types";
import { encodeId, pick, SplitwiseClient } from "../lib/client.ts";
import {
  expenseCommonBody,
  type ExpenseCommonInput,
  expenseCommonParams,
  expenseIdParam,
} from "../lib/params.ts";
import {
  allowUnbalancedParam,
  buildShareFields,
  type ShareInput,
  sharesParam,
} from "../lib/shares.ts";

/**
 * `POST /update_expense/{id}` — a partial update, with one total-replacement trap.
 *
 * > Updates an expense. Parameters are the same as in `create_expense`, but you
 * > only need to include parameters that are changing from the previous values.
 * > **If any value is supplied for `users__{index}__{property}`, _all_ shares
 * > for the expense will be overwritten with the provided values.**
 *
 * That second sentence is the reason this action exists as its own file rather
 * than a flag on Create Expense. Everything else here is a normal patch — send
 * a new `description`, the rest is untouched — but the share list is
 * **all-or-nothing**. Supplying one entry does not edit one participant's
 * numbers; it replaces the entire split with a one-person split, silently
 * dropping everybody else from the expense.
 *
 * So the shares field here is optional, and when it is supplied it must be the
 * **complete** list. Read the current shares with Get Expense, change what you
 * mean to change, and send them all back.
 *
 * ## Which cost the balance check uses
 *
 * The check needs a total, and on a partial update the caller may not be
 * changing one. When `cost` is supplied it is used; when it is not, there is no
 * total to check against — and this action refuses to guess by re-reading the
 * expense, because that would race an edit made between the read and the write.
 * Sending shares without a cost therefore requires `allowUnbalancedShares`, and
 * the error says so.
 *
 * ## Idempotent
 *
 * Unlike Create Expense, this converges: applying the same values twice leaves
 * the same expense. Safe for the runtime to retry after a dropped connection.
 */
interface Input extends ExpenseCommonInput {
  expenseId: number;
  users?: ShareInput[];
  allowUnbalancedShares?: boolean;
  group_id?: number;
}

const updateExpense: ActionDefinition<Input> = {
  key: "update-expense",
  type: "perform",
  resource: "expense",
  title: "Update Expense",
  description:
    "Change fields on an existing expense. Supplying shares REPLACES the whole split — send " +
    "every participant, not just the ones changing.",
  idempotent: true,
  params: [
    expenseIdParam,
    {
      key: "group_id",
      label: "Group ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Only to move the expense to another group. `0` moves it out of every group.",
    },
    ...expenseCommonParams(false),
    {
      ...sharesParam,
      required: false,
      hint:
        "Optional — but ALL-OR-NOTHING. Splitwise replaces every share on the expense with what " +
        "you send here, so a partial list silently removes the participants you left out. Read " +
        "the current split with Get Expense first and send it back in full.",
    },
    allowUnbalancedParam,
  ],
  output: [
    { key: "id", type: "number", label: "Expense ID" },
    { key: "cost", type: "string", label: "Total cost" },
    { key: "users", type: "array", label: "Shares after the update" },
    { key: "repayments", type: "array", label: "Derived settlement" },
  ],

  async execute(input, ctx) {
    const id = encodeId(input.expenseId, "expenseId");
    const body: Record<string, unknown> = { ...expenseCommonBody(input) };

    if (input.group_id !== undefined && input.group_id !== null) {
      const groupId = Number(input.group_id);
      if (!Number.isInteger(groupId) || groupId < 0) {
        throw new Error(
          `group_id must be a non-negative integer (0 for no group), got "${
            String(input.group_id)
          }"`,
        );
      }
      body.group_id = groupId;
    }

    const hasShares = Array.isArray(input.users)
      ? input.users.length > 0
      : typeof input.users === "string" && (input.users as string).trim() !== "";

    if (hasShares) {
      if (!input.allowUnbalancedShares && !input.cost) {
        throw new Error(
          "Updating the shares needs a `cost` to check them against. Send the expense's cost " +
            "(unchanged is fine), or set `allowUnbalancedShares` to skip the check. This action " +
            "will not re-read the expense to find the cost, because that would race any edit " +
            "made between the read and this write.",
        );
      }
      ctx.log("warn", "replacing ALL shares on this expense — participants omitted are removed", {
        expenseId: id,
        shares: Array.isArray(input.users) ? input.users.length : undefined,
      });
      Object.assign(body, buildShareFields(input.users, input.cost, input.allowUnbalancedShares));
    }

    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update — supply at least one field to change.");
    }

    const res = await new SplitwiseClient(ctx).request(`/update_expense/${id}`, {
      method: "POST",
      body,
    });
    const expenses = pick<Record<string, unknown>[]>(res, "expenses", []);
    return expenses[0] ?? {};
  },
};

export default updateExpense;
