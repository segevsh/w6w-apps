import { assertEquals, assertRejects } from "@std/assert";
import expenseCreate from "../../actions/expense-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("expense-create: POST /expenses with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await expenseCreate.execute({
    "category": 236046,
    "date": "2019-04-04",
    "amount": 2278,
    "billable": true,
    "project": "as:333045610521453",
    "attachments": "68797,68798",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/expenses");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "amount": 2278,
    "billable": true,
    "category": 236046,
    "date": "2019-04-04",
    "project": "as:333045610521453",
    "attachments": [68797, 68798],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("expense-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        expenseCreate.execute({
          "category": 236046,
          "date": "2019-04-04",
          "amount": 2278,
          "billable": true,
          "project": "as:333045610521453",
          "attachments": "68797,68798",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("expense-create: declares perform and idempotent=false", () => {
  assertEquals(expenseCreate.type, "perform");
  assertEquals(expenseCreate.idempotent, false);
});
