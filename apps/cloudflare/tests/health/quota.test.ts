import { assertEquals } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: parses RateLimit and RateLimit-Policy headers", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: cfOk({ id: "t1", status: "active" }),
      headers: {
        "content-type": "application/json",
        "ratelimit": '"default";r=1180;t=250',
        "ratelimit-policy": '"burst";q=1200;w=300',
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 1180);
  assertEquals(report.quota?.[0].limit, 1200);
  assertEquals(report.quota?.[0].unit, "requests/300s");
});

Deno.test("quota: low headroom (<10% remaining) degrades", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: cfOk({}),
      headers: { "ratelimit": '"default";r=10;t=5', "ratelimit-policy": '"burst";q=1200;w=300' },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: zero remaining reports down", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: cfOk({}),
      headers: { "ratelimit": '"default";r=0;t=5', "ratelimit-policy": '"burst";q=1200;w=300' },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: missing RateLimit header reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: cfOk({}), headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
