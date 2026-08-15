import { assert, assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "clbfknnjdfpl", name: "CallRail", url: "https://status.callrail.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "cfmjwz3wnf7x", name: "API", status: "operational", group: false },
      { id: "6w3nkf3s05z4", name: "SMS", status: "operational", group: false },
      { id: "mc9vjl2knmwm", name: "Lead Center", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("mapComponentStatus / mapIndicator: cover the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug of the name", () => {
  assertEquals(componentKey({ id: "abc123", name: "API" }, 0), "abc123");
  assertEquals(componentKey({ name: "Call Tracking" }, 3), "call-tracking-3");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service.check: all-operational summary reports ok, and group rows are excluded", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.components);
  // Only the two non-group components, not the "Lead Center" container.
  assertEquals(Object.keys(report.components!).length, 2);
  assertEquals(report.components!["cfmjwz3wnf7x"].state, "ok");
});

Deno.test("service.check: a major outage on one component still reports the page's own verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "major", description: "Partial API outage" },
      components: [
        { id: "cfmjwz3wnf7x", name: "API", status: "major_outage", group: false },
        { id: "6w3nkf3s05z4", name: "SMS", status: "operational", group: false },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  // The page indicator (major -> degraded) is trusted over deriving from components,
  // which would have picked "down" from the one major_outage component.
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("API"));
});

Deno.test("service.check: an unreachable status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: a page that no longer self-identifies as CallRail's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unsigned, app-scoped, and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.callrail.com"]);
});
