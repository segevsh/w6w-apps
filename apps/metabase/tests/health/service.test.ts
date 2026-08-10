import { assert, assertEquals } from "@std/assert";
import service, {
  componentId,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The real page's identity, verified on the wire on 2026-08-03. */
const PAGE = {
  id: "ktwqzqlh6n4y",
  name: "Metabase Cloud",
  url: "https://status.metabase.com",
};

Deno.test("service: probes the Statuspage summary and no other host", () => {
  assertEquals(STATUS_URL, "https://status.metabase.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.metabase.com"]);
});

Deno.test("service: maps Statuspage's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: maps Statuspage's page-level indicator", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("who knows"), "unknown");
});

Deno.test("componentId: slugifies a component name stably", () => {
  assertEquals(componentId("Metabase Cloud Platform"), "metabase-cloud-platform");
  assertEquals(componentId("Metabase Store"), "metabase-store");
});

Deno.test("service: an all-operational page reports ok with both components", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page: PAGE,
      components: [
        { id: "7127vgmg2vn4", name: "Metabase Cloud Platform", status: "operational" },
        { id: "x", name: "Metabase Store", status: "operational" },
      ],
      incidents: [],
      scheduled_maintenances: [],
      status: { indicator: "none", description: "All Systems Operational" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components, {
    "metabase-cloud-platform": { state: "ok" },
    "metabase-store": { state: "ok" },
  });
  assert(report.message!.includes("All Systems Operational"));
  assertEquals(calls[0].url, STATUS_URL);
  // A status host must never see a credential.
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("service: an outage is reported with the affected component named", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: PAGE,
      components: [
        { name: "Metabase Cloud Platform", status: "major_outage" },
        { name: "Metabase Store", status: "operational" },
      ],
      incidents: [{ name: "Elevated errors", status: "investigating" }],
      status: { indicator: "critical", description: "Major outage" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components!["metabase-cloud-platform"].state, "down");
  assert(report.message!.includes("metabase-cloud-platform"));
  assert(report.message!.includes("1 open incident"));
});

Deno.test("service: a broken status API is unknown — it says nothing about Metabase", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body is unknown, not down", async () => {
  const { ctx } = mockCtx([{
    body: "<html>nope</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no components is unknown", async () => {
  const { ctx } = mockCtx([{
    body: { page: PAGE, components: [], status: { indicator: "none" } },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * The `circle.statuspage.io` failure mode: a claimed, healthy Statuspage that
 * belongs to an entirely different product. If a redirect or a rebrand ever
 * points this probe somewhere else, it must report `unknown` rather than
 * cheerfully relaying another company's uptime as Metabase's.
 */
Deno.test("service: a status page that is not Metabase's is unknown, however healthy", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "abc", name: "Circle", url: "https://circle.statuspage.io" },
      components: [{ name: "API", status: "operational" }],
      status: { indicator: "none", description: "All Systems Operational" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer self-identifies"));
});

Deno.test("service: group rows are not reported as components", async () => {
  // Statuspage returns container rows with `group: true`; they duplicate their
  // children and would double-count in the roll-up.
  const { ctx } = mockCtx([{
    body: {
      page: PAGE,
      components: [
        { name: "Everything", status: "operational", group: true },
        { name: "Metabase Cloud Platform", status: "operational" },
      ],
      status: { indicator: "none" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components!), ["metabase-cloud-platform"]);
});
