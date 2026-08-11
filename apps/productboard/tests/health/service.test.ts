import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The page's own shape, trimmed from the 6,225-byte body measured 2026-08-11. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "wwwnvh1nlpt1",
      name: "Productboard",
      url: "https://status.productboard.com",
    },
    components: [
      { id: "x5zhztnyv1dd", name: "MCP, APIs and Integrations", status: "operational" },
      { id: "w3jm3wwj54jh", name: "Web Application", status: "operational" },
      { id: "dgn4hsdlwzcs", name: "External services", status: "operational", group: true },
      { id: "y46m3j5nk4v0", name: "[Email delivery] SendGrid API", status: "operational" },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("health/service: reads summary.json on the vendor's status host", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].url, "https://status.productboard.com/api/v2/summary.json");
});

Deno.test("health/service: the status host is on the CHECK's allowlist, unsigned", () => {
  assertEquals(service.network?.allow, ["status.productboard.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("health/service: it covers the component that carries the API", () => {
  assertEquals(API_COMPONENT_ID, "x5zhztnyv1dd");
  assert(service.covers!.includes(`component:${API_COMPONENT_ID}`));
});

Deno.test("health/service: an operational page reports ok and every non-group component", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  // The `group: true` container is excluded so its children are not double-counted.
  assertEquals(Object.keys(out.components!).sort(), [
    "w3jm3wwj54jh",
    "x5zhztnyv1dd",
    "y46m3j5nk4v0",
  ]);
});

Deno.test("health/service: the page indicator is the verdict, not the worst component", async () => {
  // An external dependency is down but Productboard's own roll-up says fine.
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "x5zhztnyv1dd", name: "MCP, APIs and Integrations", status: "operational" },
        { id: "y46m3j5nk4v0", name: "[Email delivery] SendGrid API", status: "major_outage" },
      ],
      status: { indicator: "none", description: "All Systems Operational" },
    }),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok", "a third party's outage must not report Productboard down");
  assertEquals(out.components!["y46m3j5nk4v0"].state, "down");
  assert(out.message!.includes("SendGrid"), out.message);
});

Deno.test("health/service: a critical indicator is down, a minor one degraded", async () => {
  for (const [indicator, expected] of [["critical", "down"], ["minor", "degraded"]] as const) {
    const { ctx } = mockCtx([{ body: summary({ status: { indicator } }) }]);
    assertEquals((await service.check!({}, ctx)).state, expected);
  }
});

Deno.test("health/service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes("500"), out.message);
});

Deno.test("health/service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("health/service: a page that stops self-identifying as Productboard's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes("self-identifies"), out.message);
});

Deno.test("health/service: a page with no components is unknown, not vacuously ok", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("health/service: open incidents and maintenance windows are surfaced", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      incidents: [{ name: "Elevated errors", status: "investigating" }],
      scheduled_maintenances: [{}],
      status: { indicator: "minor", description: "Partially Degraded Service" },
    }),
  }]);
  const out = await service.check!({}, ctx);
  assert(out.message!.includes("1 open incident(s)"), out.message);
  assert(out.message!.includes("1 scheduled maintenance window(s)"), out.message);
});

Deno.test("health/service: the Statuspage vocabularies map as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("health/service: componentKey prefers the vendor id and slugs a nameless fallback", () => {
  assertEquals(componentKey({ id: "abc", name: "X" }, 0), "abc");
  assertEquals(
    componentKey({ name: "MCP, APIs and Integrations" }, 3),
    "mcp-apis-and-integrations-3",
  );
  assertEquals(componentKey({}, 7), "component-7");
});
