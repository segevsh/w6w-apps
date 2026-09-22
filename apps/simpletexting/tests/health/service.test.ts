import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import service, {
  API_COMPONENT,
  componentKey,
  mapComponentStatus,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * Trimmed from the live response read 2026-09-22 (2,842 bytes, 8 components):
 * `Login`, `API`, and `Incoming`/`Outgoing` twice each under the `SMS` and `MMS`
 * groups, the last two being `group: true` containers.
 */
function summary(apiStatus = "operational", overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "bhk5nysrlnr0", name: "SimpleTexting", url: "https://status.simpletexting.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "sjc98qjtnv91", name: "Login", status: "operational", group: false },
      { id: "v0725wf8t7mj", name: "SMS", status: "operational", group: true },
      { id: "jz6n0zyyxth", name: "MMS", status: "operational", group: true },
      {
        id: "6knlc83f4rm0",
        name: "Incoming",
        status: "operational",
        group: false,
        group_id: "v0725wf8t7mj",
      },
      {
        id: "z0rsw6v1tv1h",
        name: "Incoming",
        status: "operational",
        group: false,
        group_id: "jz6n0zyyxth",
      },
      {
        id: "rrrw1nkwqp1b",
        name: "Outgoing",
        status: "operational",
        group: false,
        group_id: "v0725wf8t7mj",
      },
      {
        id: "ys958whs5xh4",
        name: "Outgoing",
        status: "operational",
        group: false,
        group_id: "jz6n0zyyxth",
      },
      { id: "hr9w6m13fys3", name: "API", status: apiStatus, group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

// --- pure helpers -----------------------------------------------------------

Deno.test("service: the Statuspage vocabulary maps to health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  // A status this app has never seen is not an outage.
  assertEquals(mapComponentStatus("something_new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

/**
 * `Incoming` and `Outgoing` each appear twice on this page, under different
 * groups, with different ids and the same name. A name-only key would collapse
 * them and silently drop two rows.
 */
Deno.test("service: component keys are group-qualified so the duplicates survive", () => {
  const groups = new Map([["g-sms", "SMS"], ["g-mms", "MMS"]]);
  const incoming = { id: "a", name: "Incoming", group_id: "g-sms" };
  const otherIncoming = { id: "b", name: "Incoming", group_id: "g-mms" };

  assertEquals(componentKey(incoming, groups, 0), "sms-incoming");
  assertEquals(componentKey(otherIncoming, groups, 1), "mms-incoming");
  assertEquals(componentKey({ id: "c", name: "API" }, groups, 2), "api");
  // No name at all still reports something rather than vanishing.
  assertEquals(componentKey({ id: "d" }, groups, 3), "d");
});

// --- the probe --------------------------------------------------------------

Deno.test("service: probes the status host, with no credential and no API host in its allowlist", () => {
  assertEquals(STATUS_URL, "https://status.simpletexting.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.simpletexting.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

Deno.test("service: an all-operational page reports ok, with every component", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(Object.keys(report.components!).sort(), [
    "api",
    "login",
    "mms-incoming",
    "mms-outgoing",
    "sms-incoming",
    "sms-outgoing",
  ]);
});

Deno.test("service: a major API outage is down", async () => {
  const { ctx } = mockCtx([{ body: summary("major_outage") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("API (major_outage)"), report.message);
});

Deno.test("service: a degraded API is degraded", async () => {
  const { ctx } = mockCtx([{ body: summary("partial_outage") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("API (partial_outage)"), report.message);
});

/**
 * The verdict is the API component and nothing else: this app calls one host.
 * The dashboard and the delivery pipelines are reported, and named, but they do
 * not make a workflow that only manages contacts look broken.
 */
Deno.test("service: another component's outage does not move the verdict, but is named", async () => {
  const body = summary();
  // "SMS" and "MMS" are `group: true` containers — mirrors only, filtered out
  // of the check's own `nodes` — so the mutation has to land on a real,
  // non-group component. "Login" (the web dashboard) is exactly that: a
  // component the API host this app calls does not depend on.
  body.components = body.components.map((c) =>
    c.name === "Login" ? { ...c, status: "major_outage" } : c
  ) as typeof body.components;

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assert(report.message!.includes("Login (major_outage)"), report.message);
  assertEquals(report.components!["sms-incoming"].state, "ok");
});

// --- guards -----------------------------------------------------------------

Deno.test("service: a page with no API component is unknown, never down", async () => {
  const body = summary();
  body.components = body.components.filter((c) => c.name !== "API") as typeof body.components;

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes(API_COMPONENT), report.message);
});

Deno.test("service: a page that is not SimpleTexting's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary("operational", {
      page: { name: "Someone Else", url: "https://status.elsewhere.com" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("Someone Else"), report.message);
});

Deno.test("service: a page that moved away from status.simpletexting.com is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary("operational", {
      page: { name: "SimpleTexting", url: "https://status.definitely-not-theirs.example.com" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("status.simpletexting.com"), report.message);
});

Deno.test("service: an unreachable or failing status page is unknown, never down", async () => {
  const failing = mockCtx([{ status: 503, body: "<html>maintenance</html>" }]);
  const failed = await service.check!({}, failing.ctx);
  assertEquals(failed.state, "unknown");
  assert(failed.message!.includes("503"), failed.message);

  const unreachable = {
    fetch: () => Promise.reject(new Error("getaddrinfo ENOTFOUND")),
    log: () => {},
  } as unknown as HookContext;
  const offline = await service.check!({}, unreachable);
  assertEquals(offline.state, "unknown");
  assert(offline.message!.includes("could not reach"), offline.message);
});

Deno.test("service: a non-JSON body is unknown rather than an outage", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>ok</html>" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("components"), report.message);
});
