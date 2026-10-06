import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  PAGE_ID,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return {
    page: { id: PAGE_ID, name: "Wiza", url: "https://status.wiza.co" },
    components,
    incidents: [],
    ...extra,
  };
}
const API = { id: API_COMPONENT_ID, name: "Wiza API", status: "operational" };

Deno.test("service: allowlists only the status host, on the check itself", () => {
  assertEquals(service.network, { allow: ["status.wiza.co"] });
  assertEquals(service.credential, "none");
});

Deno.test("mapComponentStatus and componentKey follow the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(componentKey({ id: "x" }, 0), "x");
  assertEquals(componentKey({ name: "Web App!" }, 3), "web-app-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: ok when the API component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: summary([API, { id: "w", name: "Wiza Web Application", status: "operational" }]),
  }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components!).length, 2);
  assertEquals(calls[0].url, "https://status.wiza.co/api/v2/summary.json");
});

Deno.test("service: an unrelated degraded component does not move the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary([API, { id: "p", name: "Wiza LinkedIn Plugin", status: "major_outage" }]),
  }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("Wiza LinkedIn Plugin"));
});

Deno.test("service: the API component's own outage is down; an open incident is noted", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ ...API, status: "major_outage" }], { incidents: [{ name: "x" }] }),
  }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("1 open incident"));
});

Deno.test("service: a missing API component, a foreign page or a broken feed is unknown, never down", async () => {
  const noApi = await service.check!(
    {} as never,
    mockCtx([{ body: summary([{ id: "w", name: "Web", status: "operational" }]) }]).ctx,
  );
  assertEquals(noApi.state, "unknown");
  const foreign = await service.check!(
    {} as never,
    mockCtx([{ body: { ...summary([API]), page: { id: "other" } } }]).ctx,
  );
  assertEquals(foreign.state, "unknown");
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 500, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: summary([]) }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: "not json" }]).ctx)).state,
    "unknown",
  );
});
