import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const body = (used: number, limit: number) => ({ body: { usage: { used, quota: limit } } });

Deno.test("quota: signed read of the free viewer with a credits reading", async () => {
  const { ctx, calls } = mockCtx([body(40, 100)]);
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
  const report = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/viewer");
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "api-credits", limit: 100, remaining: 60, unit: "credits" }]);
});

Deno.test("quota: 90% is degraded, 100% is down, a zero quota is unmetered", async () => {
  assertEquals((await quota.check!({}, mockCtx([body(90, 100)]).ctx)).state, "degraded");
  const full = await quota.check!({}, mockCtx([body(100, 100)]).ctx);
  assertEquals(full.state, "down");
  assertEquals(full.quota?.[0].remaining, 0);
  assertEquals((await quota.check!({}, mockCtx([body(5, 0)]).ctx)).state, "ok");
});

Deno.test("quota: an error status or a body without usage is unknown", async () => {
  assertEquals((await quota.check!({}, mockCtx([{ status: 403, body: {} }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ body: {} }]).ctx)).state, "unknown");
});
