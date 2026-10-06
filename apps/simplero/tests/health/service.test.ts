import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT,
  componentKey,
  mapComponentStatus,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-10-06 (7 components, no incidents). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "01KAX9KY7XBP0M0Z6X413AV3X1",
      name: "Simplero",
      url: "https://status.simplero.com/",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "01KAXBX2YX08BQPP44Q9EPGK4X", name: "API", status: "operational", group: null },
      { id: "01KBQX4A9CWQP5F1T00Z1JGYJT", name: "Background processing", status: "operational" },
      { id: "01KAX9KYBZWQH2QQCQBFPRHW0P", name: "Website", status: "operational" },
      { id: "01KBQX7ZSRD4XKJ5TZVEKW4Q3E", name: "Stripe", status: "operational" },
    ],
    incidents: null,
    scheduled_maintenances: null,
    ...overrides,
  };
}

function withStatus(name: string, status: string) {
  const body = summary();
  body.components = body.components.map((c) => c.name === name ? { ...c, status } : c);
  return body;
}

Deno.test("service: probes the status host, not the API host, unsigned", () => {
  assertEquals(STATUS_URL, "https://status.simplero.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.simplero.com"]);
  assertEquals(service.credential, "none");
  assertEquals(API_COMPONENT, "API");
});

Deno.test("service: an all-operational page reports ok and tolerates null incident lists", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(Object.keys(report.components ?? {}).length, 4);
});

Deno.test("service: an API major outage is down and names the component", async () => {
  const { ctx } = mockCtx([{ body: withStatus("API", "major_outage") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/API \(major_outage\)/.test(report.message ?? ""), report.message);
});

Deno.test("service: a non-API outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: withStatus("Stripe", "major_outage") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  const stripe = report.components?.["01KBQX7ZSRD4XKJ5TZVEKW4Q3E"];
  assertEquals(stripe?.state, "down");
});

Deno.test("service: API degraded performance is degraded, and incidents are counted", async () => {
  const body = withStatus("API", "degraded_performance") as Record<string, unknown>;
  body.incidents = [{ name: "Slow API", status: "investigating" }];
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that does not name itself Simplero is unknown", async () => {
  const body = summary({ page: { name: "Someone Else", url: "https://status.simplero.com/" } });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page with no components, or no API component, is unknown", async () => {
  const empty = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");

  const noApi = summary();
  noApi.components = noApi.components.filter((c) => c.name !== "API");
  const m = mockCtx([{ body: noApi }]);
  const report = await service.check!({}, m.ctx);
  assertEquals(report.state, "unknown");
  assert(/no "API" component/.test(report.message ?? ""), report.message);
});

Deno.test("service: mapComponentStatus and componentKey", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("surprise"), "unknown");
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Background processing" }, 3), "background-processing-3");
  assertEquals(componentKey({}, 5), "component-5");
});
