import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  PAGE_ID,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (
  components: Array<Record<string, unknown>>,
  extra: Record<string, unknown> = {},
) => ({
  page: { id: PAGE_ID, name: "Runway", url: "https://status.runwayml.com" },
  components,
  incidents: [],
  ...extra,
});
const API = { id: API_COMPONENT_ID, name: "Public API", status: "operational" };

Deno.test("service: allowlists only the status host, unsigned", () => {
  assertEquals(service.network, { allow: ["status.runwayml.com"] });
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("mapComponentStatus / componentKey", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(componentKey({ id: "x" }, 0), "x");
  assertEquals(componentKey({ name: "Web App!" }, 2), "web-app-2");
  assertEquals(componentKey({}, 4), "component-4");
});

Deno.test("service: ok when Public API is operational even if the App is degraded", async () => {
  const { ctx, calls } = mockCtx([{
    body: summary([API, { id: "app", name: "App", status: "degraded_performance" }]),
  }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!), [API_COMPONENT_ID, "app"]);
  assert(r.message!.includes("App (degraded_performance)"));
  assertEquals(calls[0].url, "https://status.runwayml.com/api/v2/summary.json");
});

Deno.test("service: the Public API component's own outage decides", async () => {
  const { ctx } = mockCtx([{ body: summary([{ ...API, status: "major_outage" }]) }]);
  assertEquals((await service.check!({} as never, ctx)).state, "down");
  const m = mockCtx([{
    body: summary([{ ...API, status: "partial_outage" }], { incidents: [{ name: "x" }] }),
  }]);
  const r = await service.check!({} as never, m.ctx);
  assertEquals(r.state, "degraded");
  assert(r.message!.includes("1 open incident"));
});

Deno.test("service: unknown, never down, for a broken, foreign or empty status page", async () => {
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 503, body: "" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: "<html>" }]).ctx)).state,
    "unknown",
  );
  const foreign = mockCtx([{ body: { ...summary([API]), page: { id: "other" } } }]);
  assertEquals((await service.check!({} as never, foreign.ctx)).state, "unknown");
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: summary([]) }]).ctx)).state,
    "unknown",
  );
  const missing = mockCtx([{ body: summary([{ id: "app", name: "App", status: "operational" }]) }]);
  const r = await service.check!({} as never, missing.ctx);
  assertEquals(r.state, "unknown");
  assert(r.message!.includes('"Public API" component not found'));
});
