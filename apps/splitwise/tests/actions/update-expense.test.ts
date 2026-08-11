import { assert, assertEquals, assertRejects } from "@std/assert";
import updateExpense from "../../actions/update-expense.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const UPDATED = { expenses: [{ id: 51023, cost: "30.00" }], errors: {} };

Deno.test("update-expense: sends only the fields that changed", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  const out = await updateExpense.execute({ expenseId: 51023, description: "Dinner" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/update_expense/51023");
  assertEquals(bodyOf(calls[0]), { description: "Dinner" });
  assertEquals(out.id, 51023);
});

/**
 * "If any value is supplied for `users__{index}__{property}`, ALL shares for
 * the expense will be overwritten with the provided values." Supplying one
 * entry replaces the whole split, silently dropping every other participant —
 * so the action warns loudly.
 */
Deno.test("update-expense: replacing shares warns that omitted participants are removed", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: UPDATED }]);
  await updateExpense.execute({
    expenseId: 51023,
    cost: "30.00",
    users: [
      { user_id: 1, paid_share: "30.00", owed_share: "15.00" },
      { user_id: 2, paid_share: "0", owed_share: "15.00" },
    ],
  }, ctx);

  const warning = logs.find((l) => l.level === "warn");
  assert(warning, "no warning for a total share replacement");
  assert(/replacing ALL shares/.test(warning.message), warning.message);
  assertEquals(bodyOf(calls[0]).users__1__owed_share, "15.00");
});

/**
 * The balance check needs a total, and re-reading the expense to find one would
 * race an edit made between the read and this write. So it is refused, with the
 * two ways out named.
 */
Deno.test("update-expense: shares without a cost are refused, and the error says why", async () => {
  const { ctx, calls } = mockCtx([]);
  const error = await assertRejects(
    async () =>
      await updateExpense.execute({
        expenseId: 1,
        users: [{ user_id: 1, paid_share: "1", owed_share: "1" }],
      }, ctx),
    Error,
    "needs a `cost` to check them against",
  );
  assert(/race any edit/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("update-expense: shares without a cost go through with the override", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await updateExpense.execute({
    expenseId: 1,
    users: [{ user_id: 1, paid_share: "1", owed_share: "1" }],
    allowUnbalancedShares: true,
  }, ctx);
  assertEquals(bodyOf(calls[0]).users__0__user_id, 1);
});

Deno.test("update-expense: unbalanced shares with a cost are refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await updateExpense.execute({
        expenseId: 1,
        cost: "30.00",
        users: [{ user_id: 1, paid_share: "1", owed_share: "1" }],
      }, ctx),
    Error,
    "Shares do not balance",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-expense: an empty share list is not a replacement", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: UPDATED }]);
  await updateExpense.execute({ expenseId: 1, description: "d", users: [] }, ctx);
  assertEquals(bodyOf(calls[0]), { description: "d" });
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("update-expense: group_id 0 moves the expense out of every group", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await updateExpense.execute({ expenseId: 1, group_id: 0 }, ctx);
  assertEquals(bodyOf(calls[0]), { group_id: 0 });
});

Deno.test("update-expense: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await updateExpense.execute({ expenseId: 1 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

/** Applying the same values twice leaves the same expense. */
Deno.test("update-expense: is idempotent, unlike create", () => {
  assertEquals(updateExpense.idempotent, true);
});
