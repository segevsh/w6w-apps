import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const headers = (remaining: string) => ({
  "content-type": "application/json",
  "zeplin-ratelimit-limit": "200",
  "zeplin-ratelimit-remaining": remaining,
  "zeplin-ratelimit-reset": "1575025620000",
});

Deno.test("quota health: reads the rate-limit headers into one quota entry", async () => {
  const { ctx, calls } = mockCtx([{ headers: headers("142"), body: { id: "u" } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/users/me");
  assertEquals(out.quota, [{
    id: "requests-per-minute",
    remaining: 142,
    unit: "requests",
    limit: 200,
    resetAt: new Date(1575025620000).toISOString(),
  }]);
});

Deno.test("quota health: zero remaining is degraded; missing headers or an error are unknown", async () => {
  const spent = mockCtx([{ headers: headers("0"), body: { id: "u" } }]);
  assertEquals((await quota.check!({}, spent.ctx)).state, "degraded");
  const none = mockCtx([{ body: { id: "u" } }]);
  assertEquals((await quota.check!({}, none.ctx)).state, "unknown");
  const err = mockCtx([{ status: 401, body: { message: "invalid_token" } }]);
  assertEquals((await quota.check!({}, err.ctx)).state, "unknown");
});

Deno.test("quota health: informational and signed (no network override)", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, undefined);
  assertEquals(quota.network, undefined);
});
