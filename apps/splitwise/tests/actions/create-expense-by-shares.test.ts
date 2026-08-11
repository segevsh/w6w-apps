import { assert, assertEquals, assertRejects } from "@std/assert";
import createExpenseByShares from "../../actions/create-expense-by-shares.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { expenses: [{ id: 51023, group_id: null, cost: "25.00" }], errors: {} };

const BRUNCH = {
  group_id: 0,
  description: "Brunch",
  cost: "25.00",
  users: [
    { user_id: 54123, paid_share: "25.00", owed_share: "13.55" },
    {
      email: "neu@example.com",
      first_name: "Neu",
      last_name: "Yewzer",
      paid_share: "0",
      owed_share: "11.45",
    },
  ],
};

Deno.test("create-expense-by-shares: flattens shares into the documented wire form", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await createExpenseByShares.execute(BRUNCH, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/create_expense");
  assertEquals(bodyOf(calls[0]), {
    group_id: 0,
    description: "Brunch",
    cost: "25.00",
    users__0__user_id: 54123,
    users__0__paid_share: "25.00",
    users__0__owed_share: "13.55",
    users__1__email: "neu@example.com",
    users__1__first_name: "Neu",
    users__1__last_name: "Yewzer",
    users__1__paid_share: "0",
    users__1__owed_share: "11.45",
  });
  assertEquals(out.id, 51023);
});

/** `group_id: 0` is legal here and only here, and must not be dropped as falsy. */
Deno.test("create-expense-by-shares: group_id 0 reaches the body", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await createExpenseByShares.execute(BRUNCH, ctx);
  assertEquals(bodyOf(calls[0]).group_id, 0);
  assertEquals(createExpenseByShares.params?.find((p) => p.key === "group_id")?.default, 0);
});

/** Both columns must total the cost, and the check runs before a request is spent. */
Deno.test("create-expense-by-shares: unbalanced shares are refused, naming both totals", async () => {
  const { ctx, calls } = mockCtx([]);
  const error = await assertRejects(
    async () =>
      await createExpenseByShares.execute({
        ...BRUNCH,
        users: [{ user_id: 1, paid_share: "10.00", owed_share: "10.00" }],
      }, ctx),
    Error,
    "Shares do not balance",
  );
  assert(/paid shares total 10.00, cost is 25.00/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

/**
 * What Splitwise does with an unbalanced expense is NOT documented — only that
 * a rejected write comes back as a 200 with `errors`. So the guard is
 * overridable, and the override sends the request untouched.
 */
Deno.test("create-expense-by-shares: allowUnbalancedShares sends it anyway", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await createExpenseByShares.execute({
    ...BRUNCH,
    users: [{ user_id: 1, paid_share: "10.00", owed_share: "10.00" }],
    allowUnbalancedShares: true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(bodyOf(calls[0]).users__0__paid_share, "10.00");
});

Deno.test("create-expense-by-shares: an unidentifiable share is refused even with the override", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await createExpenseByShares.execute({
        ...BRUNCH,
        users: [{ email: "a@b.com", paid_share: "25.00", owed_share: "25.00" }],
        allowUnbalancedShares: true,
      }, ctx),
    Error,
    "must identify a user either by user_id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-expense-by-shares: a 200 with errors throws instead of returning", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { expenses: [], errors: { base: ["Shares must add up to the cost"] } },
  }]);
  await assertRejects(
    async () => await createExpenseByShares.execute(BRUNCH, ctx),
    Error,
    "Shares must add up to the cost",
  );
});

Deno.test("create-expense-by-shares: is declared non-idempotent", () => {
  assertEquals(createExpenseByShares.idempotent, false);
});
