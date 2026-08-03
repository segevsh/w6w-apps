import { assertEquals } from "@std/assert";
import { mockCtx, mockFreshserviceCtx } from "../_helpers.ts";
import check from "../../health/quota.ts";

Deno.test("quota: is a signed, connection-scoped, informational check", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.severity, "informational");
  // A signed check must not widen egress — the probe stays on the app's own
  // `*.freshservice.com` allowlist.
  assertEquals(check.network, undefined);
});

Deno.test("quota: reads the X-Ratelimit-* headers off a one-row ticket read", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{
    body: { tickets: [] },
    headers: { "x-ratelimit-total": "500", "x-ratelimit-remaining": "480" },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets?per_page=1");
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "account", limit: 500, remaining: 480, unit: "requests" }]);
});

Deno.test("quota: tolerates the decimal header values some accounts return", async () => {
  const { ctx } = mockFreshserviceCtx([{
    body: { tickets: [] },
    headers: { "x-ratelimit-total": "7000.0", "x-ratelimit-remaining": "6952.0" },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.quota, [{ id: "account", limit: 7000, remaining: 6952, unit: "requests" }]);
});

Deno.test("quota: degrades under 10% headroom and reports down at zero", async () => {
  const low = mockFreshserviceCtx([{
    body: { tickets: [] },
    headers: { "x-ratelimit-total": "500", "x-ratelimit-remaining": "20" },
  }]);
  assertEquals((await check.check!({}, low.ctx)).state, "degraded");

  const out = mockFreshserviceCtx([{
    body: { tickets: [] },
    headers: { "x-ratelimit-total": "500", "x-ratelimit-remaining": "0" },
  }]);
  assertEquals((await check.check!({}, out.ctx)).state, "down");
});

Deno.test("quota: unknown when the headers are missing or the probe fails", async () => {
  const bare = mockFreshserviceCtx([{ body: { tickets: [] }, headers: {} }]);
  assertEquals((await check.check!({}, bare.ctx)).state, "unknown");

  const failed = mockFreshserviceCtx([{ status: 403, body: {} }]);
  assertEquals((await check.check!({}, failed.ctx)).state, "unknown");
});

Deno.test("quota: unknown, without a request, when the connection records no domain", async () => {
  const { ctx, calls } = mockCtx();
  const out = await check.check!({}, ctx);
  assertEquals(out, { state: "unknown", message: "connection records no domain" });
  assertEquals(calls.length, 0);
});
