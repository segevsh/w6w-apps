import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: ok with healthy remaining count", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { BalanceCredits: 1 },
      headers: {
        "x-rate-limit-limit": "1h",
        "x-rate-limit-remaining": "1804",
        "x-rate-limit-reset": "2026-09-15T20:35:17.712Z",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 1804);
  assertEquals(report.quota?.[0].resetAt, "2026-09-15T20:35:17.712Z");
});

Deno.test("quota: degraded when remaining is low", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: {}, headers: { "x-rate-limit-remaining": "3" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: unknown, not down, when the response carries no rate-limit header", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reads the credential's own apiHost", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: {}, headers: { "x-rate-limit-remaining": "10" } }],
    { display: { apiHost: "api-au.boldsign.com" } },
  );
  await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).hostname, "api-au.boldsign.com");
});

Deno.test("quota: declared informational severity", () => {
  assertEquals(quota.severity, "informational");
});
