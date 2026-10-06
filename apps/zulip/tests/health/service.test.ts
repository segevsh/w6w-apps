import { assert, assertEquals } from "@std/assert";
import service, {
  CLOUD_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  PAGE_ID,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (
  components: Array<Record<string, unknown>>,
  extra: Record<string, unknown> = {},
) => ({
  page: { id: PAGE_ID, name: "Zulip Cloud", url: "https://status.zulip.com" },
  components,
  incidents: [],
  ...extra,
});
const CLOUD = { id: CLOUD_COMPONENT_ID, name: "Zulip Cloud", status: "operational" };

Deno.test("service: allowlists only the status host, unsigned", () => {
  assertEquals(service.network, { allow: ["status.zulip.com"] });
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("mapComponentStatus / componentKey", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(componentKey({ id: "x" }, 0), "x");
  assertEquals(componentKey({ name: "Static CDN!" }, 2), "static-cdn-2");
  assertEquals(componentKey({}, 4), "component-4");
});

Deno.test("service: ok when Zulip Cloud is operational even if the CDN is degraded", async () => {
  const { ctx } = mockCtx([{
    body: summary([CLOUD, { id: "cdn", name: "Static asset CDN", status: "degraded_performance" }, {
      id: "g",
      name: "Supporting services",
      status: "degraded_performance",
      group: true,
    }]),
  }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!), [CLOUD_COMPONENT_ID, "cdn"]);
  assert(r.message!.includes("Static asset CDN"));
});

Deno.test("service: the Zulip Cloud component's own outage decides", async () => {
  const { ctx } = mockCtx([{ body: summary([{ ...CLOUD, status: "major_outage" }]) }]);
  assertEquals((await service.check!({} as never, ctx)).state, "down");
  const m = mockCtx([{
    body: summary([{ ...CLOUD, status: "partial_outage" }], { incidents: [{ name: "x" }] }),
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
  const foreign = { ...summary([CLOUD]), page: { id: "other" } };
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: foreign }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: summary([]) }]).ctx)).state,
    "unknown",
  );
  const missing = await service.check!(
    {} as never,
    mockCtx([{ body: summary([{ id: "z", name: "Other", status: "operational" }]) }]).ctx,
  );
  assertEquals(missing.state, "unknown");
  assert(missing.message!.includes("not found"));
});
