import { assertEquals, assertRejects } from "@std/assert";
import getExpense from "../../actions/get-expense.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-expense: unwraps the expense, shares and derived repayments", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      expense: {
        id: 51023,
        cost: "25.0",
        group_id: null,
        users: [{ user_id: 1, paid_share: "25.0", owed_share: "13.55", net_balance: "11.45" }],
        repayments: [{ from: 2, to: 1, amount: "11.45" }],
      },
    },
  }]);
  const out = await getExpense.execute({ expenseId: 51023 }, ctx) as {
    group_id: number | null;
    repayments: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_expense/51023");
  // An expense created with `group_id: 0` reads back as `null`. The two
  // spellings of "no group" do not round-trip.
  assertEquals(out.group_id, null);
  assertEquals(out.repayments.length, 1);
});

Deno.test("get-expense: a 404 is distinguishable from a 403", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(["Invalid API Request: record not found"]),
  }]);
  await assertRejects(
    async () => await getExpense.execute({ expenseId: 1 }, ctx),
    Error,
    "Splitwise 404",
  );
});

Deno.test("get-expense: a bad id fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await getExpense.execute({ expenseId: "1;2" as unknown as number }, ctx),
    Error,
    "expenseId must be a positive integer id",
  );
  assertEquals(calls.length, 0);
});
