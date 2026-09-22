import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_NAMES,
  apiComponents,
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import type { HealthState } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";

/** A summary shaped like GIPHY's real page: an API group beside the website group. */
function summary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const api = [
    ["c-search", "Search"],
    ["c-trending", "Trending"],
    ["c-translate", "Translate"],
    ["c-random", "Random"],
    ["c-media", "Media"],
    ["c-upload", "Upload"],
    ["c-developers", "Developers"],
    ["c-api", "API"],
  ].map(([id, name]) => ({ id, name, status: "operational", group: false, group_id: "grp-api" }));
  const web = [
    ["w-home", "Homepage"],
    ["w-mobile", "Mobile"],
  ].map(([id, name]) => ({ id, name, status: "operational", group: false, group_id: "grp-web" }));

  return {
    page: { id: "giphy", name: "GIPHY", url: "https://status.giphy.com" },
    components: [
      { id: "grp-api", name: "API", group: true, group_id: null },
      ...api,
      { id: "grp-web", name: "Web & Mobile", group: true, group_id: null },
      ...web,
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: reports the API group's components and nothing from Web & Mobile", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "c-api",
    "c-developers",
    "c-media",
    "c-random",
    "c-search",
    "c-translate",
    "c-trending",
    "c-upload",
  ]);
  for (const key of ["w-home", "w-mobile"]) {
    assertEquals(key in (report.components ?? {}), false, `${key} should not be reported`);
  }
});

Deno.test("service: the page-level indicator decides the verdict", async () => {
  for (
    const [indicator, expected] of [["none", "ok"], ["minor", "degraded"], ["major", "down"], [
      "critical",
      "down",
    ]] as Array<[string, HealthState]>
  ) {
    const { ctx } = mockCtx([
      { body: summary({ status: { indicator, description: "..." } }) },
    ]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, expected, indicator);
  }
});

Deno.test("service: a degraded component is reported by name and status", async () => {
  const body = summary({ status: { indicator: "minor", description: "Partially Degraded" } });
  (body.components as Array<{ id: string; status: string }>)
    .find((c) => c.id === "c-search")!.status = "degraded_performance";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["c-search"].state, "degraded");
  assertEquals(report.components?.["c-search"].message, "Search: degraded_performance");
  assertEquals(report.components?.["c-trending"].state, "ok");
  assert(/affected: Search \(degraded_performance\)/.test(report.message ?? ""), report.message);
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that stops identifying itself as GIPHY's is unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        page: { id: "x", name: "Some Other Product", url: "https://status.example.com" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page with no API-group components is unknown, not ok", async () => {
  const { ctx } = mockCtx([
    { body: summary({ components: [{ id: "grp-web", name: "Web & Mobile", group: true }] }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares its own egress and an unsigned posture", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.giphy.com"]);
  // A real feed, so a real severity — not the `informational` a declared
  // absence would carry.
  assertEquals(service.severity, undefined);
  assertEquals(typeof service.unavailable, "undefined");
  assertEquals(typeof service.check, "function");
});

/** The pure mappings, read one by one. */
Deno.test("service: Statuspage's vocabularies map as documented", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "down");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("something-new"), "unknown");

  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: apiComponents follows group_id, and falls back to the documented names", () => {
  const withIds = summary().components as Parameters<typeof apiComponents>[0];
  assertEquals(apiComponents(withIds).map((c) => c.id).includes("c-search"), true);
  assertEquals(apiComponents(withIds).map((c) => c.id).includes("w-home"), false);

  // No group ids: the documented API-group names are the fallback.
  const unnamed = [
    { id: "1", name: "Search", status: "operational" },
    { id: "2", name: "Homepage", status: "operational" },
    { id: "3", name: "API", status: "operational" },
  ];
  assertEquals(apiComponents(unnamed).map((c) => c.id), ["1", "3"]);
  assertEquals(API_COMPONENT_NAMES.includes("search"), true);
});

Deno.test("service: a component with no id still gets a stable-ish key", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Search" }, 3), "search-3");
  assertEquals(componentKey({}, 4), "component-4");
});

/** Guard the helper the check uses to roll up when there is no indicator. */
Deno.test("service: without an indicator the components decide", async () => {
  const body = summary({ status: undefined }) as Record<string, unknown>;
  (body.components as Array<{ id: string; status: string }>)
    .find((c) => c.id === "c-api")!.status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["c-api"].state, "down");
});
