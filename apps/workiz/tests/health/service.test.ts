import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * Trimmed from the live response measured 2026-09-22: `page.name: "Workiz"`,
 * 15 components including `api.workiz.com`, `status.indicator: "none"`.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "workizpage",
      name: "Workiz",
      url: "https://workiz.statuspage.io",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "api", name: "api.workiz.com", status: "operational", group: false },
      { id: "app", name: "app.workiz.com", status: "operational", group: false },
      { id: "calls", name: "Calls service", status: "operational", group: false },
      { id: "group1", name: "Communication", status: "operational", group: true },
      {
        id: "sms",
        name: "SMS service",
        status: "operational",
        group: false,
        group_id: "group1",
      },
    ],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the statuspage host, not status.workiz.com", () => {
  assertEquals(STATUS_URL, "https://workiz.statuspage.io/api/v2/summary.json");
  assertEquals(service.network?.allow, ["workiz.statuspage.io"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: the api.workiz.com component is reported under its own name", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.api?.message, "api.workiz.com");
  assertEquals(report.components?.api?.state, "ok");
});

/** `group: true` rows are containers whose status mirrors their children. */
Deno.test("service: group containers are excluded from the component report", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}).length, 4);
  assertEquals("group1" in (report.components ?? {}), false);
});

Deno.test("service: components are keyed by vendor id", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals("calls" in (report.components ?? {}), true);
});

Deno.test("service: an incident on one component degrades and names it", async () => {
  const body = summary({
    status: { indicator: "major", description: "Partial System Outage" },
    incidents: [{ name: "Elevated API errors", status: "investigating" }],
  });
  body.components[0].status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.api?.state, "down");
  assert(/api\.workiz\.com \(major_outage\)/.test(report.message ?? ""), report.message);
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

/** A status API that itself fails says nothing about Workiz — never `down`. */
Deno.test("service: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "nope" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/Status page returned 500/.test(report.message ?? ""), report.message);
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

/** A redirect or rebrand that pointed this probe at another product's page. */
Deno.test("service: a page that is no longer Workiz's reports unknown", async () => {
  const body = summary();
  body.page.url = "https://status.someone-else.example";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: the indicator rolls the page up when it is stated", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("something-new"), "unknown");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: the component vocabulary maps one-to-one", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("who-knows"), "unknown");
});

Deno.test("service: componentKey prefers the vendor id and slugs a name as fallback", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(componentKey({ name: "Calls service" }, 3), "calls-service-3");
  assertEquals(componentKey({}, 7), "component-7");
});
