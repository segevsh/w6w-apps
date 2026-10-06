import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return { page: { id: PAGE_ID, name: "Murf" }, components, incidents: [], ...extra };
}
const API = { id: API_COMPONENT_ID, name: "API", status: "operational" };
const STUDIO = { id: "fg0rh1gqsgx7", name: "Studio", status: "operational" };

Deno.test("service: allowlists only the status host, on the check itself", () => {
  assertEquals(service.network, { allow: ["murf.statuspage.io"] });
  assertEquals(service.credential, "none");
});

Deno.test("service: operational API is ok and the fetch hits the summary URL", async () => {
  const { ctx, calls } = mockCtx([{ body: summary([API, STUDIO]) }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(Object.keys(r.components ?? {}).length, 2);
});

Deno.test("service: the API component drives state, Studio only decorates", async () => {
  const studioDown = mockCtx([{ body: summary([API, { ...STUDIO, status: "major_outage" }]) }]);
  const a = await service.check!({} as never, studioDown.ctx);
  assertEquals(a.state, "ok");
  assert(a.message?.includes("Studio"));
  const apiDown = mockCtx([{ body: summary([{ ...API, status: "partial_outage" }, STUDIO]) }]);
  assertEquals((await service.check!({} as never, apiDown.ctx)).state, "degraded");
  const apiOut = mockCtx([{ body: summary([{ ...API, status: "major_outage" }]) }]);
  assertEquals((await service.check!({} as never, apiOut.ctx)).state, "down");
});

Deno.test("service: a foreign page, a missing API component, no components and a non-200 are unknown", async () => {
  const foreign = mockCtx([{ body: { ...summary([API]), page: { id: "other" } } }]);
  assertEquals((await service.check!({} as never, foreign.ctx)).state, "unknown");
  const noApi = mockCtx([{ body: summary([STUDIO]) }]);
  assertEquals((await service.check!({} as never, noApi.ctx)).state, "unknown");
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: summary([]) }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 500, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: "not json" }]).ctx)).state,
    "unknown",
  );
});

Deno.test("service: open incidents are noted; helpers map statuses and key components", async () => {
  const r = await service.check!(
    {} as never,
    mockCtx([{ body: summary([API], { incidents: [{ name: "x" }] }) }]).ctx,
  );
  assert(r.message?.includes("1 open incident"));
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("weird"), "unknown");
  assertEquals(componentKey({ name: "My Thing" }, 3), "my-thing-3");
  assertEquals(componentKey({}, 1), "component-1");
});
