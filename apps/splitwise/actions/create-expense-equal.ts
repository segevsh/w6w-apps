import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";
import { expenseCommonBody, type ExpenseCommonInput, expenseCommonParams } from "../lib/params.ts";
import { toMinorUnits } from "../lib/money.ts";

/**
 * `POST /create_expense`, the **equal-split** form.
 *
 * ```json
 * {"group_id": 391, "split_equally": true,
 *  "description": "Brunch", "cost": "25.00"}
 * ```
 *
 * ## Why this is a separate action from the by-shares form
 *
 * The reference models `create_expense`'s body as a `oneOf` of two schemas with
 * different required sets — `equal_group_split` needs
 * `group_id + split_equally + description + cost`, `by_shares` needs
 * `group_id + description + cost` plus the flattened share list. Collapsing
 * both into one action would mean a form where half the fields are required
 * only sometimes and the two halves are mutually exclusive, which no `required`
 * flag can express. Two actions each state their real contract.
 *
 * ## Three things the vendor says that the shape does not
 *
 *  1. **`split_equally` must literally be `true`.** Its schema is
 *     `{type: boolean, enum: [true]}` — there is no `split_equally: false`
 *     meaning "by shares". This action always sends `true` and does not expose
 *     it as a parameter, because the only other legal value is "use the other
 *     action".
 *  2. **A group is mandatory.** "You may either split an expense equally
 *     (**only with `group_id` provided**), or supply a list of shares." The
 *     equal split has no member list of its own; it divides across the group's
 *     members. That also rules out `group_id: 0` here — 0 is not a group, it is
 *     Splitwise's bucket for expenses belonging to none, so there is nobody to
 *     divide among. The param therefore requires a positive id, and this action
 *     rejects 0 before spending a request on it.
 *  3. **The authenticated user is the payer.** "When splitting equally, the
 *     authenticated user is assumed to be the payer." There is no way to say
 *     otherwise in this form — if someone else paid, that is the by-shares
 *     action, with their `paid_share` set to the full cost.
 *
 * ## The response is not a success just because it is a 200
 *
 * > **Note**: 200 OK does not indicate a successful response. The operation was
 * > successful only if `errors` is empty.
 *
 * `lib/client.ts` enforces that on every response, so this action returns an
 * expense or throws — it never hands back a 200 that failed.
 *
 * ## Not idempotent
 *
 * Splitwise offers no idempotency key on any endpoint. Each call creates a new
 * expense, and two identical calls create two identical expenses that both
 * count. The runtime must never retry this on its own.
 */
interface Input extends ExpenseCommonInput {
  group_id: number;
  description: string;
  cost: string;
}

const createExpenseEqual: ActionDefinition<Input> = {
  key: "create-expense-equal",
  type: "perform",
  resource: "expense",
  title: "Create Expense (Split Equally)",
  description:
    "Create an expense split equally across a group's members. The connected account is the " +
    "payer — Splitwise offers no way to say otherwise in this form.",
  idempotent: false,
  params: [
    {
      key: "group_id",
      label: "Group ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "A real group, from List Groups. Splitting equally needs a member list, so group `0` " +
        "(Splitwise's bucket for expenses in no group) is not valid here — use Create Expense " +
        "(By Shares) for those.",
    },
    ...expenseCommonParams(true),
  ],
  output: [
    { key: "id", type: "number", label: "Expense ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "cost", type: "string", label: "Total cost" },
    { key: "users", type: "array", label: "Shares Splitwise computed" },
    { key: "repayments", type: "array", label: "Derived settlement" },
  ],

  async execute(input, ctx) {
    const groupId = Number(input.group_id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error(
        `group_id must be a positive group id for an equal split, got "${
          String(input.group_id)
        }" ` +
          "— Splitwise documents this form as available only with a group, and `0` is its bucket " +
          "for expenses belonging to no group rather than a group with members",
      );
    }
    // Validate the amount before spending a request: the vendor's own failure
    // for a malformed cost is a 200 with an `errors` object, which is a longer
    // road to the same answer.
    toMinorUnits(input.cost, "cost");

    const body: Record<string, unknown> = {
      group_id: groupId,
      split_equally: true,
      ...expenseCommonBody(input),
    };

    ctx.log("info", "creating an equally-split Splitwise expense", {
      group_id: groupId,
      cost: input.cost,
    });
    const res = await new SplitwiseClient(ctx).request("/create_expense", {
      method: "POST",
      body,
    });
    const expenses = pick<Record<string, unknown>[]>(res, "expenses", []);
    return expenses[0] ?? {};
  },
};

export default createExpenseEqual;
