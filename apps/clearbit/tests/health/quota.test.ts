import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reads x-ratelimit-* headers off the free name-to-domain probe", async () => {
  const { ctx, calls } = mockCtx([{
    body: { name: "Clearbit", domain: "clearbit.com" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "600",
      "x-ratelimit-remaining": "599",
      "x-ratelimit-reset": "1785668838",
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://company.clearbit.com/v1/domains/find?name=Clearbit");
  assertEquals(result.state, "ok");
  assertEquals(result.quota?.[0].limit, 600);
  assertEquals(result.quota?.[0].remaining, 599);
  assertEquals(result.quota?.[0].resetAt, new Date(1785668838 * 1000).toISOString());
});

Deno.test("quota: low remaining-vs-limit ratio reports degraded", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: { "x-ratelimit-limit": "600", "x-ratelimit-remaining": "10" },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("quota: zero remaining reports down", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "x-ratelimit-remaining": "0" } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("quota: a 404 (unmatched but authenticated) still reads the headers", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { type: "not_found" } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "600",
      "x-ratelimit-remaining": "400",
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.quota?.[0].remaining, 400);
});

Deno.test("quota: no rate-limit headers reports unknown", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: an unreadable probe (5xx) reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: declares informational severity", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});
