import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const ws = (msg: [number, number], calls: [number, number]) => ({
  status: "ok",
  data: {
    messaging_quota: { total: msg[0], used: msg[1] },
    api_calls_quota: { total: calls[0], used: calls[1] },
  },
});

Deno.test("quota: reports remaining per bucket", async () => {
  const { ctx, calls } = mockCtx([{ body: ws([1000, 250], [5000, 100]) }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [
    { id: "messages", limit: 1000, remaining: 750, unit: "messages" },
    { id: "api_calls", limit: 5000, remaining: 4900, unit: "calls" },
  ]);
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/workspace");
});

Deno.test("quota: an exhausted API-call quota is down", async () => {
  const { ctx } = mockCtx([{ body: ws([1000, 0], [100, 100]) }]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: an exhausted messaging quota is degraded, not down", async () => {
  const { ctx } = mockCtx([{ body: ws([100, 100], [5000, 1]) }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: no counters is unknown", async () => {
  const { ctx } = mockCtx([{ body: { status: "ok", data: {} } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a vendor error is unknown, never a guess", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: "error", error_code: "invalid_token" },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
