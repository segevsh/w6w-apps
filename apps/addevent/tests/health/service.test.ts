import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REAL_SUMMARY = {
  page: { id: "nc62r985h5rk", name: "AddEvent", url: "https://addevent.statuspage.io" },
  components: [
    { id: "lmm205x80lkl", name: "AddEvent Dashboard", status: "operational" },
    { id: "m3m4p48l1slj", name: "AddEvent Website", status: "operational" },
    { id: "3dfhm69wv905", name: "AddEvent API", status: "operational" },
    { id: "tn83fyy26rmm", name: "AddEvent Landing Pages", status: "operational" },
  ],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
};

Deno.test("service: all-operational summary reports ok with every component", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: REAL_SUMMARY }]);
  const report = await service.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 4);
  assertEquals(report.components?.["3dfhm69wv905"].state, "ok");
});

Deno.test("service: a major outage on the API component reports down via the page indicator", async () => {
  const degraded = {
    ...REAL_SUMMARY,
    components: [
      ...REAL_SUMMARY.components.slice(0, 2),
      { id: "3dfhm69wv905", name: "AddEvent API", status: "major_outage" },
      REAL_SUMMARY.components[3],
    ],
    status: { indicator: "critical", description: "API outage" },
  };
  const { ctx } = mockCtx([{ status: 200, body: degraded }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["3dfhm69wv905"].state, "down");
  assertEquals(report.message?.includes("AddEvent API (major_outage)"), true, report.message);
});

Deno.test("service: an unreachable status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: undefined }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unparsable body reports unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

/**
 * The unclaimed-decoy guard: `addevent.instatus.com` is a live, confirmed-unclaimed
 * sibling host that also answers 200. If this check's response ever carried that
 * page's own `page.url` instead of AddEvent's, it must be caught rather than reported
 * as a genuine AddEvent status.
 */
Deno.test("service: a page that no longer self-identifies as AddEvent's reports unknown", async () => {
  const wrongPage = {
    ...REAL_SUMMARY,
    page: { ...REAL_SUMMARY.page, url: "https://example.instatus.com" },
  };
  const { ctx } = mockCtx([{ status: 200, body: wrongPage }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers the documented page-level indicator vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: unsigned and app-scoped, widening egress to the status host only", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["addevent.statuspage.io"]);
});
