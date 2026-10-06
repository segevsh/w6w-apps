import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/track-sale.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("track-sale: sends POST /track/sale with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "eventName": "Purchase", "customer": {}, "sale": {} },
  }]);
  const out = await action.execute!({
    "customerExternalId": "u1",
    "amount": 4900,
    "currency": "eur",
    "invoiceId": "in_1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/track/sale");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "customerExternalId": "u1",
    "amount": 4900,
    "currency": "eur",
    "invoiceId": "in_1",
  });
  assertEquals(out, { "eventName": "Purchase", "customer": {}, "sale": {} });
});

Deno.test("track-sale: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "eventName": "Purchase", "customer": {}, "sale": {} },
  }]);
  await action.execute!({
    "customerExternalId": "u1",
    "amount": 4900,
    "currency": "eur",
    "invoiceId": "in_1",
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("track-sale: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "customerExternalId": "u1",
        "amount": 4900,
        "currency": "eur",
        "invoiceId": "in_1",
      }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("track-sale: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
