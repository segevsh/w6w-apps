import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

Deno.test("quota: reports ok headroom from x-rate-limit-* headers", async () => {
  const { ctx } = mockCtx([{
    body: { data: { id: "1" } },
    headers: {
      "content-type": "application/json",
      "x-rate-limit-limit": "75",
      "x-rate-limit-remaining": "60",
      "x-rate-limit-reset": "1999999999",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 60);
  assertEquals(report.quota?.[0].limit, 75);
});

Deno.test("quota: reports down when remaining is exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-rate-limit-limit": "75",
      "x-rate-limit-remaining": "0",
      "x-rate-limit-reset": "1999999999",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: reports unknown when the rate-limit headers are absent", async () => {
  const { ctx } = mockCtx([{
    body: { data: { id: "1" } },
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares absence rather than guessing at an undocumented endpoint", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.check, undefined);
  assertEquals(typeof service.unavailable?.reason, "string");
});
