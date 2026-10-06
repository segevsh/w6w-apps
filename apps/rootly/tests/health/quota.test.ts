import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const h = (limit: string, remaining: string, reset = "1791314045") => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
  "x-ratelimit-reset": reset,
});

Deno.test("quota health: reads the two-valued limit header and an epoch reset", async () => {
  const { ctx, calls } = mockCtx([{ headers: h("3000, 3000;window=60", "2999"), body: {} }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://api.rootly.com/v1/users/me");
  assertEquals(out.quota, [{
    id: "requests",
    limit: 3000,
    remaining: 2999,
    resetAt: new Date(1791314045 * 1000).toISOString(),
    unit: "requests",
  }]);
});

Deno.test("quota health: low headroom is degraded, none is down, no headers is unknown", async () => {
  const low = await quota.check!({}, mockCtx([{ headers: h("3000, 3000;window=60", "100") }]).ctx);
  assertEquals(low.state, "degraded");
  const none = await quota.check!({}, mockCtx([{ headers: h("3000, 3000;window=60", "0") }]).ctx);
  assertEquals(none.state, "down");
  const bare = await quota.check!({}, mockCtx([{ body: {} }]).ctx);
  assertEquals(bare.state, "unknown");
  const bad = await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx);
  assertEquals(bad.state, "unknown");
});

Deno.test("quota health: is informational so low headroom never fails a verdict", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
