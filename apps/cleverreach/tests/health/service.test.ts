import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-10-06 (12 components, all operational). */
const NAMES = ["Platform availability", "Mail delivery", "Forms", API_COMPONENT, "Integrations"];

function summary(overrides: Record<string, string> = {}, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "p", name: "CleverReach", url: "https://status.cleverreach.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: NAMES.map((name) => ({
      id: `id-${name}`,
      name,
      status: overrides[name] ?? "operational",
      group: false,
    })),
    incidents: [],
    ...extra,
  };
}

Deno.test("service: probes the status host, unauthenticated", () => {
  assertEquals(STATUS_URL, "https://status.cleverreach.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.cleverreach.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: maps Statuspage's vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("nope"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: all operational is ok and reports every component", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).length, NAMES.length);
});

Deno.test("service: the Rest-API component decides the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary({ [API_COMPONENT]: "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("Rest-API (major_outage)"));
});

Deno.test("service: an unrelated component never moves the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary({ Forms: "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["id-Forms"].state, "down");
  assert(out.message!.includes("Forms (major_outage)"));
});

Deno.test("service: without a Rest-API component the page indicator decides", async () => {
  const body = summary({}, { status: { indicator: "major" } });
  body.components = body.components.filter((c) => c.name !== API_COMPONENT);
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a page that is not CleverReach's, or is broken, is unknown, never down", async () => {
  for (
    const r of [
      { status: 503, body: "x" },
      { body: "not json" },
      { body: summary({}, { page: { name: "Someone Else" } }) },
      { body: summary({}, { components: [] }) },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});
