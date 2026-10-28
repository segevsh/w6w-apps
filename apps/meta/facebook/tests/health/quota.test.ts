import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("health/quota: declares quota kind and informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});

Deno.test("health/quota: ok when every meter is well under 90%", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-app-usage": JSON.stringify({ call_count: 10, total_cputime: 5, total_time: 5 }),
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 3);
  assertEquals(report.quota?.find((q) => q.id === "call_count")?.remaining, 90);
});

Deno.test("health/quota: degraded at >=90% used, down at >=100%", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { id: "u1" },
      headers: {
        "content-type": "application/json",
        "x-app-usage": JSON.stringify({ call_count: 95, total_cputime: 100 }),
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("health/quota: unknown when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/quota: unknown when no X-App-Usage header is present", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("X-App-Usage"), true);
});
