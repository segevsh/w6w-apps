import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

test("quota: parses the X-RateLimit-*-Minute headers off the whoami probe", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { id: 4 },
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit-minute": "400",
        "x-ratelimit-remaining-minute": "380",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, "https://api.helpscout.net/v2/users/me");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 380);
  assertEquals(report.quota?.[0].limit, 400);
});

test("quota: low headroom (<10% remaining) degrades", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit-minute": "400", "x-ratelimit-remaining-minute": "10" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

test("quota: zero remaining reports down", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit-minute": "400", "x-ratelimit-remaining-minute": "0" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

test("quota: missing X-RateLimit-*-Minute headers reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {}, headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota: a failing probe reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
