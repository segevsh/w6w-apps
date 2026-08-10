import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { API_COMPONENT, slug } from "../../health/service.ts";

/**
 * The five components as `status.attio.com/api/v2/summary.json` actually
 * returned them on 2026-08-03, descriptions and all.
 */
const COMPONENTS = [
  { name: "Customer Helpdesk", status: "operational" },
  { name: "Attio Cloud Storage", status: "operational" },
  { name: "Background Tasks", status: "operational" },
  { name: "Attio Web Client", status: "operational" },
  { name: "Attio Cloud", status: "operational" },
];

const summary = (
  components = COMPONENTS,
  status = { indicator: "none", description: "All Systems Operational" },
) => ({ status, components });

Deno.test("service: unsigned, app-scoped, and widens egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.attio.com"]);
  // `credential` and `scope` are left at kind `service`'s defaults of
  // `none` / `app`, which is what makes widening egress permissible at all.
  assertEquals(service.credential, undefined);
  assertEquals(service.scope, undefined);
});

Deno.test("service: probes summary.json, which carries the rollup AND the components", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.attio.com/api/v2/summary.json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service: all operational is ok, and every component is reported", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary() }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), [
    "attio-cloud",
    "attio-cloud-storage",
    "attio-web-client",
    "background-tasks",
    "customer-helpdesk",
  ]);
});

/**
 * The whole reason this check narrows its signal. A helpdesk or web-client
 * outage moves the rollup indicator, and a check keyed on the rollup would
 * report every tenant's workflows as degraded over an incident that cannot
 * touch a single API call.
 */
Deno.test("service: stays ok when only non-API components are down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [
        { name: "Customer Helpdesk", status: "major_outage" },
        { name: "Attio Web Client", status: "major_outage" },
        { name: "Attio Cloud", status: "operational" },
      ],
      { indicator: "major", description: "Major Service Outage" },
    ),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  // …but an operator still sees the outage, and the rollup, in the message.
  assertEquals(result.components!["customer-helpdesk"].state, "down");
  assert(result.message!.includes("Major Service Outage"), result.message);
});

Deno.test("service: reports down when the API component itself is out", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [{ name: "Attio Cloud", status: "major_outage" }],
      { indicator: "major", description: "Major Service Outage" },
    ),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(result.message!.includes("Attio Cloud: major_outage"), result.message);
});

Deno.test("service: maps degraded_performance, partial_outage and maintenance to degraded", async () => {
  for (const status of ["degraded_performance", "partial_outage", "under_maintenance"]) {
    const { ctx } = mockCtx([{ status: 200, body: summary([{ name: "Attio Cloud", status }]) }]);
    assertEquals((await service.check!({}, ctx)).state, "degraded", status);
  }
});

/**
 * The API component is `Attio Cloud`, NOT `Attio Cloud Storage` — the two slugs
 * differ by a suffix and picking the wrong one would report the files/enrichment
 * service as if it were the API.
 */
Deno.test("service: keys on Attio Cloud and not on Attio Cloud Storage", async () => {
  assertEquals(API_COMPONENT, "attio-cloud");
  assertEquals(slug("Attio Cloud"), "attio-cloud");
  assertEquals(slug("Attio Cloud Storage"), "attio-cloud-storage");

  const { ctx } = mockCtx([{
    status: 200,
    body: summary([
      { name: "Attio Cloud Storage", status: "major_outage" },
      { name: "Attio Cloud", status: "operational" },
    ]),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/**
 * If Attio renames the component, the check must say so out loud rather than
 * report a confident `unknown` that is indistinguishable from a healthy API.
 */
Deno.test("service: falls back to the rollup, loudly, if the API component vanishes", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [{ name: "Something Else", status: "operational" }],
      { indicator: "minor", description: "Partially Degraded Service" },
    ),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes('no "Attio Cloud" component'), result.message);
  assert(result.message!.includes("Partially Degraded Service"), result.message);
});

Deno.test("service: group headers are skipped — they only restate their children", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([
      { name: "Platform", status: "operational", group: true } as never,
      { name: "Attio Cloud", status: "operational" },
    ]),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components!), ["attio-cloud"]);
});

/**
 * A status page that is itself broken says nothing about the vendor. Reporting
 * that as an outage would be a lie.
 */
Deno.test("service: a failing status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("503"), result.message);
});

Deno.test("service: an unparseable body is unknown, not a false ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: an unrecognised component status is unknown, not assumed ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([{ name: "Attio Cloud", status: "who_knows" }]),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * Deliberately NOT informational. The signal is narrowed to the component this
 * app depends on, and Attio is pure multi-tenant SaaS with no self-hosted
 * edition — so an Attio Cloud outage affects every Connection without
 * exception, which is exactly what the default severity is for.
 */
Deno.test("service: keeps the default degraded severity", () => {
  assertEquals(service.severity, undefined);
  assertEquals(service.minIntervalSeconds, 60);
});
