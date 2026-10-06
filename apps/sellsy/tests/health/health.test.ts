import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const unauth = {
  status: 401,
  body: {
    error: { code: 401, message: 'Missing "Authorization" header', details: [], context: null },
  },
};

Deno.test("service: a schema-correct 401 is a pass", async () => {
  const { ctx, calls } = mockCtx([unauth]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.sellsy.com/v2/quotas");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service: 5xx is down; a 401 without the envelope is unknown; a bare 200 is unknown", async () => {
  const { ctx } = mockCtx([
    { status: 502, body: "bad gateway", headers: { "content-type": "text/plain" } },
    { status: 401, body: "<html>login</html>", headers: { "content-type": "text/html" } },
    { status: 200, body: { id: 1 } },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "down");
  assertEquals((await service.check!({}, ctx)).state, "unknown");
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} } as never;
  assertEquals((await service.check!({}, ctx)).state, "down");
});

const hdr = (o: Record<string, string>) => ({ "content-type": "application/json", ...o });

Deno.test("quota: reads the remaining headers and the limits from the body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { api_rate_minutes: { limit: 600, used: 10 }, api_rate_days: { limit: 100000, used: 1 } },
    headers: hdr({ "x-quota-remaining-by-minute": "590", "x-quota-remaining-by-day": "99999" }),
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.map((q) => [q.id, q.remaining, q.limit]), [
    ["requests-per-minute", 590, 600],
    ["requests-per-day", 99999, 100000],
  ]);
});

Deno.test("quota: degraded under 5% headroom", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { api_rate_minutes: { limit: 600, used: 590 } },
    headers: hdr({ "x-quota-remaining-by-minute": "10" }),
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: unknown on 403 (no accounts.read) and when no headers are sent", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { error: { code: 403, message: "Forbidden" } } },
    { status: 200, body: {} },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: informational, signed, connection-scoped", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
