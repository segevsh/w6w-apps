import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

test("invoice-get: GETs /invoices/{id} and returns the unwrapped object", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "7" } },
  }]);
  assertEquals(await action.execute({ invoiceId: 7 }, ctx), { id: "7" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/invoices/7");
});

test("invoice-get: passes _fields through", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "7" } },
  }]);
  await action.execute({ invoiceId: 7, fields: "_ALL" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/invoices/7?_fields=_ALL");
});

test("invoice-get: rejects a missing id before any request", async () => {
  const { ctx, calls } = mockAcceloCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "positive numeric id");
  assertEquals(calls.length, 0);
});
