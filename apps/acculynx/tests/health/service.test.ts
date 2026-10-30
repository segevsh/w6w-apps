import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "plnhlfldnnpp", name: "AccuLynx", url: "https://status.acculynx.com" },
    components,
    incidents: [],
    ...extra,
  };
}
const API = { id: API_COMPONENT_ID, name: "API", status: "operational" };

test("service: allowlists only the status host, on the check itself", () => {
  assertEquals(service.network, { allow: ["status.acculynx.com"] });
  assertEquals(service.credential, "none");
});

test("mapComponentStatus: maps the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

test("componentKey: prefers the id, falls back to a slug of the name", () => {
  assertEquals(componentKey({ id: "x" }, 0), "x");
  assertEquals(componentKey({ name: "Web App!" }, 3), "web-app-3");
  assertEquals(componentKey({}, 7), "component-7");
});

test("service: ok when the API component is operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([API, { id: "w", name: "Web Application", status: "operational" }]),
  }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components!).length, 2);
});

test("service: an unrelated degraded component does not move the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([API, { id: "w", name: "Web Application", status: "partial_outage" }]),
  }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("Web Application"));
});

test("service: the API component's own outage is down", async () => {
  const { ctx } = mockCtx([{ body: summary([{ ...API, status: "major_outage" }]) }]);
  assertEquals((await service.check!({} as never, ctx)).state, "down");
});

test("service: groups are ignored and a missing API component is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: "g", name: "Add-Ons", status: "operational", group: true },
      { id: "w", name: "Web Application", status: "operational" },
    ]),
  }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes('"API" component not found'));
});

test("service: open incidents are noted", async () => {
  const { ctx } = mockCtx([{ body: summary([API], { incidents: [{ name: "x" }] }) }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("1 open incident"));
});

test("service: a broken status API is unknown, never down", async () => {
  for (const r of [{ status: 503, body: "" }, { status: 200, body: "not json" }]) {
    const { ctx } = mockCtx([r]);
    assertEquals((await service.check!({} as never, ctx)).state, "unknown");
  }
});

test("service: a page that no longer self-identifies as AccuLynx's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: { ...summary([API]), page: { id: "z", name: "Other", url: "https://status.other.com" } },
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

test("service: no components at all is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary([]) }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});
