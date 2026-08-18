import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const page = (over: Record<string, string> = {}) => ({
  components: [
    "Application Availability (US)",
    "Ingestion API Availability (US)",
    "Application Availability (EU)",
    "Ingestion API Availability (EU)",
    "Data Export",
    "Warehouse Connectors",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

const us = { display: { projectId: "1", region: "us" } };
const eu = { display: { projectId: "1", region: "eu" } };

Deno.test("service: all green reports ok for this region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }], us);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).sort(), ["export", "ingestion", "query"]);
  assertEquals(new URL(calls[0].url).host, "www.mixpanelstatus.com");
});

/** Querying and ingesting fail independently, so one out is degraded. */
Deno.test("service: an ingestion outage alone is degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({ "Ingestion API Availability (US)": "major_outage" }),
  }], us);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.components!.query.state, "ok");
});

Deno.test("service: both regional components out is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({
      "Application Availability (US)": "major_outage",
      "Ingestion API Availability (US)": "major_outage",
    }),
  }], us);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/** Another region's outage is not this project's problem. */
Deno.test("service: an EU outage leaves a US project green", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({
      "Application Availability (EU)": "major_outage",
      "Ingestion API Availability (EU)": "major_outage",
    }),
  }], us);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the same outage IS the problem for an EU project", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({
      "Application Availability (EU)": "major_outage",
      "Ingestion API Availability (EU)": "major_outage",
    }),
  }], eu);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], us);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: is connection-scoped and unsigned", () => {
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "context");
  assertEquals(service.network!.allow, ["www.mixpanelstatus.com"]);
});

/** Measuring headroom would cost one of the sixty. */
Deno.test("quota: is a declared absence carrying the actual limits", () => {
  assert(quota.unavailable, "quota should be declared unavailable");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(/60 queries per hour/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/x-ratelimit/i.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
