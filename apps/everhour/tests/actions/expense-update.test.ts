import { assertEquals, assertRejects } from "@std/assert";
import expenseUpdate from "../../actions/expense-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("expense-update: PUT /expenses/{expenseId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await expenseUpdate.execute({
    "expenseId": 7810,
    "category": 236046,
    "date": "2019-04-04",
    "details": "Taxi",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/expenses/7810");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "category": 236046,
    "date": "2019-04-04",
    "details": "Taxi",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("expense-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        expenseUpdate.execute({
          "expenseId": 7810,
          "category": 236046,
          "date": "2019-04-04",
          "details": "Taxi",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("expense-update: declares perform and idempotent=true", () => {
  assertEquals(expenseUpdate.type, "perform");
  assertEquals(expenseUpdate.idempotent, true);
});
