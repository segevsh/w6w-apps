import { assert, assertEquals } from "@std/assert";
import service, {
  apiGroupStates,
  componentState,
  indicatorState,
  slug,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * The real page's group ids, from `status.circle.so/api/v2/summary.json` on
 * 2026-08-03. Using the actual ids keeps the fixture honest.
 */
const DEV_API_GROUP = "11jgnbpcphch";
const COMMUNITIES_GROUP = "k31c52dymznn";
const APPS_GROUP = "ql6tt12jqzhm";

function summary(overrides: Record<string, string> = {}) {
  const status = (name: string, fallback = "operational") => overrides[name] ?? fallback;
  return {
    page: { id: "qjlztzff1xhv", name: "Circle" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: DEV_API_GROUP, name: "Developer API", status: "operational", group: true },
      {
        id: "qy34dbr6bpxg",
        name: "REST API",
        status: status("REST API"),
        group: false,
        group_id: DEV_API_GROUP,
      },
      { id: COMMUNITIES_GROUP, name: "Communities", status: "operational", group: true },
      {
        id: "0fvytnt9hvzn",
        name: "Posts & Comments",
        status: status("Posts & Comments"),
        group: false,
        group_id: COMMUNITIES_GROUP,
      },
      { id: APPS_GROUP, name: "Apps", status: "operational", group: true },
      {
        id: "454wffwmyn00",
        name: "Circle iOS App",
        status: status("Circle iOS App"),
        group: false,
        group_id: APPS_GROUP,
      },
    ],
    incidents: [],
    scheduled_maintenances: [],
  };
}

Deno.test("service: probes the verified Statuspage summary endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(STATUS_URL, "https://status.circle.so/api/v2/summary.json");
});

Deno.test("service: never sends a credential to a third-party status host", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  // `none` is this kind's default; assert it is not overridden to something signed.
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("service: egress is widened for the status host only, and not on the app allowlist", () => {
  assertEquals(service.network?.allow, ["status.circle.so"]);
});

Deno.test("service: all systems operational reports ok with every component listed", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  // Group rows are skipped; the three leaves are reported.
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "circle-ios-app",
    "posts-comments",
    "rest-api",
  ]);
});

Deno.test("service: a REST API outage drives the verdict down", async () => {
  const { ctx } = mockCtx([{ body: summary({ "REST API": "major_outage" }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["rest-api"].state, "down");
});

/**
 * The judgement this check exists to make. Circle's global indicator aggregates
 * the mobile apps and the help centre, which no action in this app can reach.
 * Taking it would degrade every tenant because an iOS release wobbled.
 */
Deno.test("service: a mobile-app outage does NOT degrade the verdict, but IS reported", async () => {
  const { ctx } = mockCtx([{
    body: {
      ...summary({ "Circle iOS App": "major_outage" }),
      status: { indicator: "major", description: "Major Service Outage" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok", "the Developer API group is what the verdict tracks");
  assertEquals(report.components?.["circle-ios-app"].state, "down");
  assert(report.message!.includes("circle-ios-app"), "still surfaced for display");
  assert(report.message!.includes("Major Service Outage"), "vendor roll-up is still shown");
});

Deno.test("service: if the Developer API group disappears, it falls back LOUDLY", async () => {
  const body = summary();
  body.components = body.components.filter((c) =>
    c.id !== DEV_API_GROUP && c.group_id !== DEV_API_GROUP
  );
  body.status = { indicator: "minor", description: "Partially Degraded Service" };
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("Developer API"), "the fallback announces itself");
});

Deno.test("service: a broken status page is `unknown`, never `down`", async () => {
  // A status API that itself fails says nothing about Circle.
  for (const queued of [{ status: 503, body: "" }, { status: 200, body: "not json" }]) {
    const { ctx } = mockCtx([queued]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a summary with no named components is `unknown`", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "none" }, components: [] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: Statuspage vocabularies map as documented", () => {
  assertEquals(componentState("operational"), "ok");
  assertEquals(componentState("degraded_performance"), "degraded");
  assertEquals(componentState("partial_outage"), "degraded");
  assertEquals(componentState("under_maintenance"), "degraded");
  assertEquals(componentState("major_outage"), "down");
  assertEquals(componentState("who_knows"), "unknown");

  assertEquals(indicatorState("none"), "ok");
  assertEquals(indicatorState("minor"), "degraded");
  assertEquals(indicatorState("major"), "down");
  assertEquals(indicatorState("critical"), "down");
  assertEquals(indicatorState(undefined), "unknown");
});

Deno.test("service: the group lookup is case-insensitive and skips the group row itself", () => {
  const components = summary().components;
  assertEquals(apiGroupStates(components), ["ok"]);
  assertEquals(apiGroupStates(components, "DEVELOPER API"), ["ok"]);
  assertEquals(apiGroupStates(components, "nope"), []);
});

Deno.test("service: slug produces stable component selectors", () => {
  assertEquals(slug("Posts & Comments"), "posts-comments");
  assertEquals(slug("Paywalls & Member Billing"), "paywalls-member-billing");
});
