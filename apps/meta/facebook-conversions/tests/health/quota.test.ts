import { assertEquals, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const appUsage = (v: Record<string, number>) => ({
  "content-type": "application/json",
  "x-app-usage": JSON.stringify(v),
});

Deno.test("health/quota: declares quota kind and informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("health/quota: ok when every meter is well under 90%", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: "u1" },
      headers: appUsage({ call_count: 10, total_cputime: 5, total_time: 5 }),
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/me");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 3);
  assertEquals(report.quota?.find((q) => q.id === "app.call_count")?.remaining, 90);
});

Deno.test("health/quota: degraded at >=90% used, down at >=100%", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1" }, headers: appUsage({ call_count: 95 }) }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");

  const { ctx: ctx2 } = mockCtx([{ body: { id: "u1" }, headers: appUsage({ call_count: 100 }) }]);
  assertEquals((await quota.check!({}, ctx2)).state, "down");
});

Deno.test("health/quota: reads the business use-case meters Marketing API calls are counted against", async () => {
  const { ctx } = mockCtx([
    {
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-business-use-case-usage": JSON.stringify({
          "9876": [{
            type: "ads_management",
            call_count: 30,
            total_cputime: 20,
            total_time: 20,
            estimated_time_to_regain_access: 0,
          }],
        }),
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 3);
  assertEquals(report.quota?.find((q) => q.id === "ads_management.call_count")?.remaining, 70);
});

Deno.test("health/quota: a non-zero regain-access estimate is a hard down with a reset time", async () => {
  const { ctx } = mockCtx([
    {
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-business-use-case-usage": JSON.stringify({
          "9876": [{ type: "ads_management", call_count: 10, estimated_time_to_regain_access: 15 }],
        }),
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  const blocked = report.quota?.find((q) => q.id === "ads_management.blocked");
  assertEquals(blocked?.remaining, 0);
  assertEquals(typeof blocked?.resetAt, "string");
});

Deno.test("health/quota: unknown when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("health/quota: unknown when neither usage header is present", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message ?? "", "X-App-Usage");
});

Deno.test("health/quota: unknown when a usage header is not valid JSON", async () => {
  const { ctx } = mockCtx([
    { body: { id: "u1" }, headers: { "content-type": "application/json", "x-app-usage": "{oops" } },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
