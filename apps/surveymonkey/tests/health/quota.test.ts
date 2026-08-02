import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: parses X-Ratelimit-App-Global-* headers and converts delta reset to ISO", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { id: "1234" },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-app-global-minute-limit": "120",
        "x-ratelimit-app-global-minute-remaining": "110",
        "x-ratelimit-app-global-minute-reset": "45",
        "x-ratelimit-app-global-day-limit": "500",
        "x-ratelimit-app-global-day-remaining": "450",
        "x-ratelimit-app-global-day-reset": "3600",
      },
    },
  ]);
  const before = Date.now();
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  const minute = report.quota?.find((q) => q.id === "minute");
  const day = report.quota?.find((q) => q.id === "day");
  assertEquals(minute?.limit, 120);
  assertEquals(minute?.remaining, 110);
  assertEquals(day?.limit, 500);
  assertEquals(day?.remaining, 450);
  // Reset headers are seconds-from-now, not an epoch — assert the ISO string
  // lands within a tolerant window of `now + delta` rather than an exact match.
  const minuteResetMs = new Date(minute!.resetAt!).getTime();
  assertEquals(minuteResetMs >= before + 45_000 && minuteResetMs <= Date.now() + 45_000, true);
});

Deno.test("quota: low headroom (<10% remaining) on either window degrades", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: {
        "x-ratelimit-app-global-minute-limit": "120",
        "x-ratelimit-app-global-minute-remaining": "5",
        "x-ratelimit-app-global-day-limit": "500",
        "x-ratelimit-app-global-day-remaining": "450",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: zero remaining on the daily window reports down", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: {
        "x-ratelimit-app-global-day-limit": "500",
        "x-ratelimit-app-global-day-remaining": "0",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: missing rate-limit headers reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {}, headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a failing probe reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
