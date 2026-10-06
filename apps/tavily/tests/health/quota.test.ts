import { assertEquals } from "@std/assert";
import quota, { reading, USAGE_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: reads /usage and reports plan, paygo and key headroom", async () => {
  const body = {
    key: { usage: 10, limit: null },
    account: { plan_usage: 500, plan_limit: 1000, paygo_usage: 0, paygo_limit: 100 },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, USAGE_URL);
  assertEquals(r.state, "ok");
  assertEquals(r.quota!.map((q) => q.id), ["plan-credits", "paygo-credits"]);
  assertEquals(r.quota![0].remaining, 500);
});

Deno.test("quota: 90% is degraded, 100% is down", () => {
  assertEquals(reading("x", 90, 100)!.state, "degraded");
  assertEquals(reading("x", 100, 100)!.state, "down");
  assertEquals(reading("x", 120, 100)!.quota.remaining, 0);
});

Deno.test("quota: a null or zero limit is no ceiling, not exhausted", () => {
  assertEquals(reading("x", 5, null), undefined);
  assertEquals(reading("x", 5, 0), undefined);
});

Deno.test("quota: worst dimension wins and is named", async () => {
  const body = { key: { usage: 100, limit: 100 }, account: { plan_usage: 1, plan_limit: 100 } };
  const r = await quota.check!({} as never, mockCtx([{ body }]).ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message, "key-credits at 100/100 (100%)");
});

Deno.test("quota: failures and empty bodies are unknown", async () => {
  assertEquals(
    (await quota.check!({} as never, mockCtx([{ status: 401, body: {} }]).ctx)).state,
    "unknown",
  );
  assertEquals((await quota.check!({} as never, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals(
    (await quota.check!({} as never, mockCtx([{ body: { account: {} } }]).ctx)).state,
    "unknown",
  );
});
