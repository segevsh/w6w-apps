import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: is informational and reuses the app's own allowlist (no extra egress)", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reads RateLimit-* headers (no X- prefix) and converts a delta reset to an ISO timestamp", async () => {
  const { ctx } = mockCtx([
    {
      body: [{ id: 1 }],
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "300",
        "ratelimit-remaining": "280",
        "ratelimit-reset": "45",
      },
    },
  ]);
  const before = Date.now();
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  const bucket = report.quota?.[0];
  assertEquals(bucket?.limit, 300);
  assertEquals(bucket?.remaining, 280);
  const resetAt = new Date(bucket!.resetAt!).getTime();
  // resetAt should land ~45s after "now", not at epoch+45s or some absolute misread.
  assertEquals(resetAt > before + 40_000 && resetAt < before + 50_000, true);
});

Deno.test("quota: reports unknown when no rate-limit headers are present", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1 }] }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: headroom below 10% is degraded, exhausted is down", async () => {
  const { ctx: ctxLow } = mockCtx([
    { body: [], headers: { "ratelimit-limit": "100", "ratelimit-remaining": "5" } },
  ]);
  assertEquals((await quota.check!({}, ctxLow)).state, "degraded");

  const { ctx: ctxZero } = mockCtx([
    { body: [], headers: { "ratelimit-limit": "100", "ratelimit-remaining": "0" } },
  ]);
  assertEquals((await quota.check!({}, ctxZero)).state, "down");
});
