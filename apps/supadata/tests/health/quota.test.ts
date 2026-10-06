import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const me = (used: number, max = 1000) => ({
  organizationId: "o",
  plan: "pro",
  maxCredits: max,
  usedCredits: used,
});

Deno.test("quota: ok with the remaining credits, from a signed-posture GET /me", async () => {
  const { ctx, calls } = mockCtx([{ body: me(100) }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "credits", limit: 1000, remaining: 900, unit: "credits" }]);
  assertEquals(out.message, "100 of 1000 credits used (pro plan)");
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/me");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: degraded at 90% used, down at 100% (remaining never negative)", async () => {
  assertEquals((await quota.check!({}, mockCtx([{ body: me(900) }]).ctx)).state, "degraded");
  const out = await quota.check!({}, mockCtx([{ body: me(1200) }]).ctx);
  assertEquals(out.state, "down");
  assertEquals(out.quota?.[0].remaining, 0);
  assertEquals((await quota.check!({}, mockCtx([{ body: me(899) }]).ctx)).state, "ok");
});

Deno.test("quota: unknown on a non-2xx or a document without counters", async () => {
  assertEquals((await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ body: { plan: "x" } }]).ctx)).state, "unknown");
});
