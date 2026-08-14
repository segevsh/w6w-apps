import { assert, assertEquals } from "@std/assert";
import service, {
  componentId,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const PAGE = {
  id: "ykjdtv1csj3l",
  name: "GetResponse",
  url: "https://status.getresponse.com",
};

function summary(over: Record<string, unknown> = {}) {
  return {
    page: PAGE,
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "c-api", name: "API", status: "operational", group: false },
      { id: "c-webhooks", name: "Webhooks", status: "operational", group: false },
      { id: "c-grp", name: "Integration", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...over,
  };
}

/**
 * The probe is credential-free by design: the network widening below lets it
 * reach a third-party host, and a third-party host must never see the API key.
 */
Deno.test("service: reaches only the status host, with no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.getresponse.com"]);
  assert(STATUS_URL.startsWith("https://status.getresponse.com/"), STATUS_URL);
});

/**
 * GetResponse is SaaS-only — retail and MAX are both vendor-hosted — so an
 * incident here really is evidence about every Connection. That is why this one
 * keeps the `degraded` default instead of dropping to informational the way the
 * self-hostable apps in this pack do.
 */
Deno.test("service: keeps the degraded default rather than going informational", () => {
  assertEquals(service.severity, undefined);
  assertEquals(service.unavailable, undefined);
  assertEquals(service.covers, ["*"]);
});

Deno.test("service: reports ok and one component per non-group row", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  // Three rows in, two out: the group row would double-count its children.
  assertEquals(Object.keys(report.components ?? {}), ["api", "webhooks"]);
  assertEquals(report.components?.api, { state: "ok" });
});

Deno.test("service: a component outage lands in the report with its raw status", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "major", description: "Partial outage" },
      components: [
        { id: "c-api", name: "API", status: "major_outage", group: false },
        { id: "c-webhooks", name: "Webhooks", status: "operational", group: false },
      ],
      incidents: [{ name: "Elevated API errors", status: "investigating" }],
    }),
  }]);
  const report = await service.check!({}, ctx);

  // `major` is the page indicator, and Statuspage reserves `critical` for a full
  // outage — so the roll-up is degraded even though the component itself is down.
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.api, { state: "down", message: "major_outage" });
  assert(report.message!.includes("affected: api"), report.message);
  assert(report.message!.includes("1 open incident"), report.message);
});

/** The page-level roll-up wins when it is present — it is the vendor's own verdict. */
Deno.test("service: the indicator decides the state, not the worst component", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c-api", name: "API", status: "degraded_performance", group: false },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.api.state, "degraded");
});

/** With no indicator to defer to, the worst component carries the report. */
Deno.test("service: without an indicator it falls back to the worst component", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: undefined,
      components: [
        { id: "c-api", name: "API", status: "operational", group: false },
        { id: "c-forms", name: "Forms and Popups", status: "partial_outage", group: false },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

/**
 * A broken status API is not an outage of GetResponse. Reporting `down` here
 * would page somebody over Statuspage's own bad day.
 */
Deno.test("service: a non-2xx from Statuspage is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("503"), report.message);
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("unreadable"), report.message);
});

/**
 * The guard that matters if the page is ever redirected or rebranded: a healthy,
 * claimed page belonging to somebody else would otherwise read as good news.
 */
Deno.test("service: a page that is not GetResponse's is unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("self-identifies"), report.message);
});

Deno.test("service: an empty component list is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no components"), report.message);
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: only `critical` is down; maintenance is degraded", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentId: slugifies a name into a stable selector", () => {
  assertEquals(componentId("API"), "api");
  assertEquals(componentId("Contacts (+Import)"), "contacts-import");
  assertEquals(componentId("Forms and Popups"), "forms-and-popups");
});
