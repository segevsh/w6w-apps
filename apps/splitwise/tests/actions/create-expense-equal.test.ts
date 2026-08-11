import { assert, assertEquals, assertRejects } from "@std/assert";
import createExpenseEqual from "../../actions/create-expense-equal.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const CREATED = {
  expenses: [{ id: 51023, description: "Brunch", cost: "25.00", users: [] }],
  errors: {},
};

Deno.test("create-expense-equal: sends split_equally with the group and common fields", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await createExpenseEqual.execute({
    group_id: 391,
    description: "Brunch",
    cost: "25.00",
    currency_code: "USD",
    category_id: 15,
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/create_expense");
  assertEquals(bodyOf(calls[0]), {
    group_id: 391,
    split_equally: true,
    description: "Brunch",
    cost: "25.00",
    currency_code: "USD",
    category_id: 15,
  });
  assertEquals(out.id, 51023);
});

/**
 * `split_equally` is declared `{type: boolean, enum: [true]}` — there is no
 * `false` meaning "by shares". It is never exposed as a parameter.
 */
Deno.test("create-expense-equal: split_equally is always true and is not a param", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await createExpenseEqual.execute({ group_id: 1, description: "d", cost: "1" }, ctx);
  assertEquals(bodyOf(calls[0]).split_equally, true);
  assertEquals(createExpenseEqual.params?.some((p) => p.key === "split_equally"), false);
});

/**
 * "You may either split an expense equally (only with `group_id` provided)."
 * Group 0 is not a group — it is Splitwise's bucket for expenses belonging to
 * none — so there is nobody to divide among.
 */
Deno.test("create-expense-equal: group 0 is refused before a request is spent", async () => {
  const { ctx, calls } = mockCtx([]);
  const error = await assertRejects(
    async () => await createExpenseEqual.execute({ group_id: 0, description: "d", cost: "1" }, ctx),
    Error,
    "group_id must be a positive group id",
  );
  assert(/Create Expense \(By Shares\)|belonging to no group/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("create-expense-equal: a malformed cost fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await createExpenseEqual.execute({ group_id: 1, description: "d", cost: "25.005" }, ctx),
    Error,
    "at most 2 decimal places",
  );
  assertEquals(calls.length, 0);
});

/**
 * "200 OK does not indicate a successful response. The operation was successful
 * only if `errors` is empty."
 */
Deno.test("create-expense-equal: a 200 with errors throws instead of returning", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { expenses: [], errors: { base: ["That group does not exist"] } },
  }]);
  await assertRejects(
    async () => await createExpenseEqual.execute({ group_id: 1, description: "d", cost: "1" }, ctx),
    Error,
    "That group does not exist",
  );
});

Deno.test("create-expense-equal: is declared non-idempotent — there is no idempotency key", () => {
  assertEquals(createExpenseEqual.idempotent, false);
});
