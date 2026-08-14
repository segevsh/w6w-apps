import { assert, assertEquals } from "@std/assert";
import service, {
  componentId,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = { id: "wufoo", name: "Wufoo", url: "https://status.wufoo.com" };

function summary(over: Record<string, unknown> = {}) {
  return {
    page: PAGE,
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "c-app", name: "Wufoo Application", status: "operational", group: false },
      { id: "c-grp", name: "Services", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...over,
  };
}

/**
 * The probe is credential-free by design: the allowlist below lets it reach a
 * third-party host, and a third-party host must never see the API key.
 */
Deno.test("service: reaches only the status host, with no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.wufoo.com"]);
  assertEquals(STATUS_URL, "https://status.wufoo.com/api/v2/summary.json");
});

Deno.test("service: reports ok and skips the group row", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  // The group row would double-count its children.
  assertEquals(Object.keys(report.components ?? {}), ["wufoo-application"]);
});

Deno.test("service: an outage lands in the report with its raw status", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "critical", description: "Major outage" },
      components: [
        { id: "c-app", name: "Wufoo Application", status: "major_outage", group: false },
      ],
      incidents: [{ name: "Forms unavailable", status: "identified" }],
    }),
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.["wufoo-application"], {
    state: "down",
    message: "major_outage",
  });
  assert(report.message!.includes("affected: wufoo-application"), report.message);
  assert(report.message!.includes("1 open incident"), report.message);
});

/** With no page indicator to defer to, the worst component carries the report. */
Deno.test("service: without an indicator it falls back to the worst component", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: undefined,
      components: [
        { id: "c-app", name: "Wufoo Application", status: "degraded_performance", group: false },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

/**
 * A broken status API is not an outage of Wufoo. Reporting `down` here would
 * page somebody over Statuspage's own bad day.
 */
Deno.test("service: a non-2xx from Statuspage is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("502"), report.message);
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("unreadable"), report.message);
});

/**
 * The guard that matters if the page is ever redirected or rebranded — Wufoo is
 * a SurveyMonkey property, so a future move is not hypothetical. A healthy page
 * belonging to somebody else must not read as good news.
 */
Deno.test("service: a page that is not Wufoo's is unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { id: "x", name: "Other", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("self-identifies"), report.message);
});

/**
 * Wufoo's page publishes no components at all, so — unlike the other Statuspage
 * probes in this pack — an empty list is the NORMAL reading, not a broken page.
 * The indicator carries the verdict and `components` is omitted rather than
 * reported as an empty object.
 */
Deno.test("service: no components is normal here — the indicator decides", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components, undefined);
});

/** With neither an indicator nor components there is nothing to read. */
Deno.test("service: no indicator and no components is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ status: undefined, components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: only `critical` is down; maintenance is degraded", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("brand-new-value"), "unknown");
});

Deno.test("componentId: slugifies a name into a stable selector", () => {
  assertEquals(componentId("Wufoo Application"), "wufoo-application");
  assertEquals(componentId("API & Integrations"), "api-integrations");
});
