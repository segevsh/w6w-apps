import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  API_COMPONENT_NAME,
  findApiComponent,
  mapComponentStatus,
  mapIndicator,
  STATUS_HOST,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * Trimmed to the components that matter, in the shape status.practicebetter.io
 * serves: the API component, one end-user portal, one group row and two of the
 * sixteen Integrations children.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "lb02qlh5617c",
      name: "Practice Better",
      url: "https://status.practicebetter.io",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "operational", group: false },
      { id: "web1", name: "Web Portal", status: "operational", group: false },
      { id: "int1", name: "Integrations", status: "operational", group: true },
      { id: "zoom1", name: "Zoom", status: "operational", group: false, group_id: "int1" },
      {
        id: "stripe1",
        name: "Stripe",
        status: "degraded_performance",
        group: false,
        group_id: "int1",
      },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.practicebetter.io/api/v2/summary.json");
  assertEquals(STATUS_HOST, "status.practicebetter.io");
  assertEquals(service.network?.allow, ["status.practicebetter.io"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

Deno.test("service: the page id and the API component id are the verified ones", () => {
  assertEquals(API_COMPONENT_ID, "hg7zsrq27t7g");
  assertEquals(API_COMPONENT_NAME, "Practice Better API");
});

Deno.test("service: an all-operational page reports ok, keyed by component id", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assert(report.components![API_COMPONENT_ID] !== undefined);
  assertEquals(report.components![API_COMPONENT_ID].message, API_COMPONENT_NAME);
  // The Integrations group row is a container and is not reported separately.
  assertEquals(report.components!["int1"], undefined);
  // Its children are reported under their own ids.
  assertEquals(report.components!["zoom1"].state, "ok");
});

Deno.test("service: the API component decides, even when the page indicator is worse", async () => {
  const { ctx } = mockCtx([{
    body: summary({ status: { indicator: "minor", description: "Partially Degraded Service" } }),
  }]);
  const report = await service.check!({}, ctx);
  // Stripe is degraded on the same page, and the page roll-up follows it.
  assertEquals(report.components!["stripe1"].state, "degraded");
  assertEquals(report.state, "ok");
  assert(/page-level indicator/.test(report.message!), report.message);
  assert(/Stripe \(degraded_performance\)/.test(report.message!), report.message);
});

Deno.test("service: a degraded API component is the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "degraded_performance" },
        { id: "web1", name: "Web Portal", status: "operational" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/Practice Better API: degraded_performance/.test(report.message!), report.message);
});

Deno.test("service: a major outage on the API component is down", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [{ id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "major_outage" }],
    }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a page without the API component reports unknown, never a verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary({ components: [{ id: "web1", name: "Web Portal", status: "operational" }] }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no longer publishes/.test(report.message!), report.message);
});

Deno.test("service: a page that stops identifying as Practice Better's reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      page: { id: "other", name: "Someone Else", url: "https://status.example.org" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no longer self-identifies/.test(report.message!), report.message);
});

Deno.test("service: the alternative Statuspage hostname is accepted too", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      page: {
        id: "lb02qlh5617c",
        name: "Practice Better",
        url: "https://practicebetter.statuspage.io",
      },
    }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a broken status API says nothing about Practice Better", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/returned 500/.test(report.message!), report.message);

  const unreadable = mockCtx([{ status: 200, body: "not json" }]);
  assertEquals((await service.check!({}, unreadable.ctx)).state, "unknown");

  const empty = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");
});

Deno.test("service: the mapping helpers follow Statuspage's documented vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: the API component is matched by id first, then by exact name", () => {
  assertEquals(findApiComponent([{ id: API_COMPONENT_ID, name: "renamed" }])?.name, "renamed");
  assertEquals(
    findApiComponent([{ id: "new-id", name: API_COMPONENT_NAME }])?.id,
    "new-id",
  );
  // Never a substring match: the Integrations group must not stand in for the API.
  assertEquals(findApiComponent([{ id: "int1", name: "Practice Better Integrations" }]), undefined);
});
