import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = {
  page: { id: "kwh95bwgs0qz", name: "Plivo" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { name: "REST APIs and XML", status: "operational", group: false },
    { name: "Voice API", status: "operational", group: true },
    { name: "SMS API", status: "partial_outage", group: false },
  ],
};

Deno.test("service: declared unsigned, with its own status-host allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, undefined);
  assertEquals(service.network, { allow: ["status.plivo.com"] });
});

Deno.test("service: reads the Statuspage summary and maps rollup + components", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.plivo.com/api/v2/summary.json");
  assertEquals(r.state, "ok");
  assertEquals(r.message, "All Systems Operational");
  // group headers skipped; names slugged
  assertEquals(r.components, {
    "rest-apis-and-xml": { state: "ok" },
    "sms-api": { state: "degraded" },
  });
});

Deno.test("service: indicators map minor→degraded, major→down", async () => {
  for (const [indicator, state] of [["minor", "degraded"], ["major", "down"]] as const) {
    const { ctx } = mockCtx([{ body: { ...SUMMARY, status: { indicator } } }]);
    assertEquals((await service.check!({}, ctx)).state, state);
  }
});

Deno.test("service: an unreachable or unrecognised status page is unknown, never down", async () => {
  const bad = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await service.check!({}, bad.ctx)).state, "unknown");
  const odd = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await service.check!({}, odd.ctx)).state, "unknown");
});

Deno.test("quota: a declared absence that cannot worsen the roll-up", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
