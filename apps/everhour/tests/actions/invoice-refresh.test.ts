import { assertEquals, assertRejects } from "@std/assert";
import invoiceRefresh from "../../actions/invoice-refresh.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-refresh: POST /invoices/{invoiceId}/reset-time with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await invoiceRefresh.execute({
    "invoiceId": 11903,
    "limitDateFrom": "2019-03-11",
    "includeExpenses": true,
    "expenseMask": "%PROJECT%",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/invoices/11903/reset-time");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "limitDateFrom": "2019-03-11",
    "includeExpenses": true,
    "expenseMask": "%PROJECT%",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("invoice-refresh: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        invoiceRefresh.execute({
          "invoiceId": 11903,
          "limitDateFrom": "2019-03-11",
          "includeExpenses": true,
          "expenseMask": "%PROJECT%",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("invoice-refresh: declares perform and idempotent=true", () => {
  assertEquals(invoiceRefresh.type, "perform");
  assertEquals(invoiceRefresh.idempotent, true);
});
