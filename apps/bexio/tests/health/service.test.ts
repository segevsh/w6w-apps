import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: probes the real bexio Statuspage summary endpoint, unsigned", () => {
  assertEquals(STATUS_URL, "https://www.bexio-status.com/api/v2/summary.json");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["www.bexio-status.com"]);
});

Deno.test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers the documented page-level roll-up", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug", () => {
  assertEquals(componentKey({ id: "41gdvj56k2gy", name: "bexio Website" }, 0), "41gdvj56k2gy");
  assertEquals(componentKey({ name: "bexio Website" }, 2), "bexio-website-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: all-operational page (real shape) reports ok", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { id: "5t5kfdrl9rr6", name: "bexio AG", url: "https://www.bexio-status.com" },
        components: [
          { id: "41gdvj56k2gy", name: "bexio Website", status: "operational", group: false },
          { id: "1584v6p1gglm", name: "bexio Office", status: "operational", group: false },
          {
            id: "ggfncwqhmk6g",
            name: "Banking interfaces",
            status: "operational",
            group: true,
          },
        ],
        incidents: [],
        scheduled_maintenances: [],
        status: { indicator: "none", description: "All Systems Operational" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  // The group row is excluded — only the two leaf components are reported.
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: a degraded component surfaces in the message and the verdict", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { url: "https://www.bexio-status.com" },
        components: [
          { id: "a", name: "bexio Office", status: "partial_outage", group: false },
        ],
        incidents: [{ name: "Office slow", status: "investigating" }],
        status: { indicator: "minor" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("bexio Office"), report.message);
  assert(report.message?.includes("1 open incident"), report.message);
});

Deno.test("service: a non-2xx status page response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as bexio's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: { page: { url: "https://status.example.com" }, components: [], status: {} } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
