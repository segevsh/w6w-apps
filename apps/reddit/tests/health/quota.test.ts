import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok headroom from x-ratelimit-* headers", async () => {
  const { ctx } = mockCtx([{
    body: { id: "1" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-used": "10.0",
      "x-ratelimit-remaining": "590.0",
      "x-ratelimit-reset": "300",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 590);
  assertEquals(report.quota?.[0].limit, 600);
});

Deno.test("quota: reports down when remaining is exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-used": "600.0",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "30",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: reports degraded under 10% headroom", async () => {
  const { ctx } = mockCtx([{
    body: { id: "1" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-used": "590.0",
      "x-ratelimit-remaining": "5.0",
      "x-ratelimit-reset": "30",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports unknown when the rate-limit headers are absent", async () => {
  const { ctx } = mockCtx([{ body: { id: "1" }, headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
