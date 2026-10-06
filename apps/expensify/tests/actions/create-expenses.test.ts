import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-expenses.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const EXPENSE = { merchant: "Cafe", created: "2026-01-01", amount: 1234, currency: "USD" };

Deno.test("create-expenses: posts a create/expenses job and returns the created list", async () => {
  const created = [{ ...EXPENSE, transactionID: "6720309558248016" }];
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, transactionList: created } }]);
  const out = await action.execute!({ transactionList: [EXPENSE], employeeEmail: "u@d.com" }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "create",
    inputSettings: { type: "expenses", employeeEmail: "u@d.com", transactionList: [EXPENSE] },
  });
  assertEquals(out, { transactionList: created, count: 1 });
});

Deno.test("create-expenses: accepts the list as JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, transactionList: [] } }]);
  await action.execute!({ transactionList: JSON.stringify([EXPENSE]) }, ctx);
  assertEquals(sent(calls[0]).job.inputSettings.transactionList, [EXPENSE]);
  assert(!("employeeEmail" in sent(calls[0]).job.inputSettings));
});

Deno.test("create-expenses: rejects a malformed date, a non-integer amount and an empty list before the wire", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ transactionList: [{ ...EXPENSE, created: "16-01-01" }] }, ctx),
    Error,
    "yyyy-mm-dd",
  );
  await assertRejects(
    async () => await action.execute!({ transactionList: [{ ...EXPENSE, amount: 12.5 }] }, ctx),
    Error,
    "integer number of cents",
  );
  await assertRejects(
    async () => await action.execute!({ transactionList: [{ ...EXPENSE, merchant: "" }] }, ctx),
    Error,
    "merchant is required",
  );
  await assertRejects(
    async () => await action.execute!({ transactionList: [] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-expenses: surfaces the vendor's HTTP-200 error envelope", async () => {
  const { ctx } = mockCtx([{
    body: {
      responseMessage: "Malformed date '16-01-01'. Expected format is yyyy-MM-dd",
      responseCode: 410,
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ transactionList: [EXPENSE] }, ctx),
    Error,
    "Malformed date",
  );
});

Deno.test("create-expenses: declares a non-idempotent perform with output", () => {
  assertEquals([action.type, action.idempotent], ["perform", false]);
  assert(action.params!.length > 0 && Array.isArray(action.output));
});
