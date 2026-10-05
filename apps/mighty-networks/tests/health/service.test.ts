import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT,
  componentState,
  indicatorState,
  slug,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shaped like the real `summary.json` (fetched 2026-10-05): no `incidents` key. */
function summary(overrides: Record<string, string> = {}, indicator = "none") {
  const status = (name: string) => overrides[name] ?? "operational";
  return {
    page: { id: "01KG0661FEC0F7JBKC9SC60ARD", name: "Mighty Networks" },
    status: { indicator, description: "All Systems Operational" },
    components: ["Web App", "API (Public Network Feed)", "API Access", "iOS", "Zoom"].map((
      name,
    ) => ({
      id: slug(name),
      name,
      status: status(name),
    })),
    scheduled_maintenances: [],
  };
}

Deno.test("service: probes the verified summary endpoint on the vendor's own host", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(STATUS_URL, "https://status.mightynetworks.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.mightynetworks.com"]);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service: all operational -> ok, with every component reported", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!), [
    "web-app",
    "api-public-network-feed",
    "api-access",
    "ios",
    "zoom",
  ]);
});

Deno.test("service: the verdict follows API Access, not the page indicator", async () => {
  const down = mockCtx([{ body: summary({ "API Access": "major_outage" }, "major") }]);
  assertEquals((await service.check!({}, down.ctx)).state, "down");
  const partial = mockCtx([{ body: summary({ "API Access": "partial_outage" }) }]);
  assertEquals((await service.check!({}, partial.ctx)).state, "degraded");
  const full = mockCtx([{ body: summary({ "API Access": "full_outage" }) }]);
  assertEquals((await service.check!({}, full.ctx)).state, "down");
});

Deno.test("service: an iOS outage alone leaves the API verdict ok but is still reported", async () => {
  const { ctx } = mockCtx([{ body: summary({ iOS: "major_outage" }, "major") }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components!["ios"].state, "down");
  assert(r.message!.includes("affected: ios"));
});

Deno.test("service: a missing API Access component falls back to the indicator, loudly", async () => {
  const body = summary({}, "minor");
  body.components = body.components.filter((c) => c.name !== "API Access");
  const { ctx } = mockCtx([{ body }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "degraded");
  assert(r.message!.includes("no `API Access` component"));
});

Deno.test("service: a page that is not Mighty Networks is unknown, never ok", async () => {
  const body = summary();
  body.page.name = "Somebody Else";
  const { ctx } = mockCtx([{ body }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "unknown");
  assert(r.message!.includes("Somebody Else"));
});

Deno.test("service: a failing or unreadable status page is unknown, not down", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
  const empty = summary();
  empty.components = [];
  assertEquals((await service.check!({}, mockCtx([{ body: empty }]).ctx)).state, "unknown");
});

Deno.test("service: maintenance windows and incidents are mentioned", async () => {
  const body = { ...summary(), incidents: [{}], scheduled_maintenances: [{}, {}] };
  const r = await service.check!({}, mockCtx([{ body }]).ctx);
  assert(r.message!.includes("1 open incident"));
  assert(r.message!.includes("2 scheduled maintenance"));
});

Deno.test("service: vocab helpers map unknown words to unknown", () => {
  assertEquals(componentState("weird"), "unknown");
  assertEquals(componentState(undefined), "unknown");
  assertEquals(indicatorState("critical"), "down");
  assertEquals(indicatorState("weird"), "unknown");
  assertEquals(API_COMPONENT, slug("API Access"));
});
