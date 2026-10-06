import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const run = (ctx: never) => quota.check!({} as never, ctx);

Deno.test("quota: reads GET /v1/credits and reports the balance as a quota reading", async () => {
  const { ctx, calls } = mockCtx([{
    body: { planCredits: 90, anytimeCredits: 10, totalCredits: 100 },
  }]);
  const result = await run(ctx as never);
  assertEquals(calls[0].url, `${API_ROOT}/credits`);
  assertEquals(result.state, "ok");
  assertEquals(result.quota, [{ id: "credits", remaining: 100, unit: "credits" }]);
});

Deno.test("quota: zero credits is down — sending is refused, not slowed", async () => {
  const { ctx } = mockCtx([{ body: { totalCredits: 0 } }]);
  const result = await run(ctx as never);
  assertEquals(result.state, "down");
});

Deno.test("quota: a non-OK status or a body without totalCredits is unknown, never down", async () => {
  const bad = await run(mockCtx([{ status: 401, body: { title: "x" } }]).ctx as never);
  assertEquals(bad.state, "unknown");
  const odd = await run(mockCtx([{ body: { hello: 1 } }]).ctx as never);
  assertEquals(odd.state, "unknown");
});

Deno.test("quota: a signed connection-scoped quota check with no unavailable marker", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.unavailable, undefined);
  assert(typeof quota.check === "function");
});
