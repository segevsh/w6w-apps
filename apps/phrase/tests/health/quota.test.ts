import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, withRegion } from "../_helpers.ts";

const headers = (remaining: string, limit = "1000", reset = "1790000000") => ({
  "content-type": "application/json",
  "x-rate-limit-limit": limit,
  "x-rate-limit-remaining": remaining,
  "x-rate-limit-reset": reset,
});

Deno.test("quota: is informational and probes GET /user", async () => {
  assertEquals(quota.severity, "informational");
  const { ctx, calls } = mockCtx([{ headers: headers("900"), body: { id: "u1" } }]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.phrase.com/v2/user");
});

Deno.test("quota: reports the window from X-Rate-Limit-* headers", async () => {
  const { ctx } = mockCtx([{ headers: headers("900"), body: { id: "u1" } }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{
    id: "requests",
    limit: 1000,
    remaining: 900,
    resetAt: new Date(1790000000 * 1000).toISOString(),
    unit: "requests",
  }]);
});

Deno.test("quota: under 10% is degraded, zero is down", async () => {
  assertEquals(
    (await quota.check!({}, mockCtx([{ headers: headers("50"), body: {} }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await quota.check!({}, mockCtx([{ headers: headers("0"), body: {} }]).ctx)).state,
    "down",
  );
});

Deno.test("quota: no headers is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a failed probe is unknown and a US connection probes the US host", async () => {
  const { ctx, calls } = withRegion(mockCtx([{ status: 401, body: "" }]), "us");
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
  assertEquals(calls[0].url, "https://api.us.app.phrase.com/v2/user");
});
