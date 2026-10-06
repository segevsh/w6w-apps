import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/payment-get.ts";
import { gateway, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-get: GET /v1/payments/{id} and returns the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", version: 3 } }]);
  const out = await action.execute({ id: "x1" }, ctx) as { version: number };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/payments/x1");
  assertEquals(out.version, 3);
});

Deno.test("payment-get: id is path-escaped so it cannot leave the segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "a/b?c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/payments/a%2Fb%3Fc");
});

Deno.test("payment-get: missing id throws before the network; vendor error is surfaced", async () => {
  const none = mockCtx();
  await assertRejects(async () => await action.execute({ id: " " }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
  const nf = mockCtx([{ status: 404, body: { ...gateway("Not Found"), status: 404 } }]);
  const err = await assertRejects(async () => await action.execute({ id: "z" }, nf.ctx), Error);
  assert(err.message.includes("404") && err.message.includes("Not Found"));
});
