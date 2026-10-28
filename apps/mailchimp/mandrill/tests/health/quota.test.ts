import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: ok when backlog is zero, reports hourly_quota as the limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hourly_quota: 1000, backlog: 0 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    id: "hourly",
    limit: 1000,
    remaining: undefined,
    unit: "emails/hour",
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/users/info.json");
});

Deno.test("quota: degraded when backlog is nonzero but below hourly_quota", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hourly_quota: 1000, backlog: 50 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: down when backlog meets or exceeds hourly_quota", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hourly_quota: 1000, backlog: 1000 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: unknown when the response carries no hourly_quota", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: unknown (not down) on a non-2xx probe response", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { status: "error", code: -1, name: "Invalid_Key", message: "Invalid API key" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "Invalid API key");
});
