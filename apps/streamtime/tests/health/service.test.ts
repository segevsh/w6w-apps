import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_NAME,
  componentKey,
  mapComponentStatus,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * Trimmed from the live response measured on 2026-09-22 (200,
 * `application/json; charset=utf-8`, 1,645 bytes): four components, the second
 * of which is the REST API this app calls.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "rlq4qng98yy1", name: "Streamtime", url: "https://streamtime.statuspage.io" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "4cfm77347sjk", name: "Frontend", status: "operational", group: false },
      { id: "yk5flc04qqv8", name: "API", status: "operational", group: false },
      { id: "p97zqdscz051", name: "Streamtime.net", status: "operational", group: false },
      { id: "1tt0ftjtdrld", name: "MCP API", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, unsigned, with its own allowlist", () => {
  assertEquals(STATUS_URL, "https://streamtime.statuspage.io/api/v2/summary.json");
  assertEquals(service.network?.allow, ["streamtime.statuspage.io"]);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("API operational"), report.message);
});

/**
 * `MCP API` sits on the same page and is a different product surface ("Dedicated
 * API for our MCP Server"). A substring match would pick the wrong component, so
 * the roll-up matches the name exactly.
 */
Deno.test("service: the verdict comes from the component named API, matched exactly", async () => {
  assertEquals(API_COMPONENT_NAME, "API");

  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "a", name: "Frontend", status: "operational", group: false },
          { id: "b", name: "MCP API", status: "major_outage", group: false },
          { id: "c", name: "API", status: "operational", group: false },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  // The affected sibling is still reported, so the reader can see it.
  assertEquals(report.components?.b.state, "down");
  assert(report.message?.includes("MCP API (major_outage)"), report.message);
});

Deno.test("service: a Frontend outage alone does not fail the API check", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "a", name: "Frontend", status: "major_outage", group: false },
          { id: "c", name: "API", status: "operational", group: false },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("affected: Frontend (major_outage)"), report.message);
});

Deno.test("service: a degraded API reports degraded, an outage reports down", async () => {
  for (
    const [status, expected] of [
      ["degraded_performance", "degraded"],
      ["partial_outage", "degraded"],
      ["under_maintenance", "degraded"],
      ["major_outage", "down"],
      ["someone-elses-vocabulary", "unknown"],
    ]
  ) {
    const { ctx } = mockCtx([
      { body: summary({ components: [{ id: "c", name: "API", status, group: false }] }) },
    ]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, expected, status);
  }
});

Deno.test("service: mapComponentStatus is a three-value vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor id, then a slug of the name", () => {
  assertEquals(componentKey({ id: "yk5flc04qqv8", name: "API" }, 0), "yk5flc04qqv8");
  assertEquals(componentKey({ name: "MCP API" }, 3), "mcp-api-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: a renamed page is not trusted", async () => {
  const { ctx } = mockCtx([
    { body: summary({ page: { name: "Somebody Else", url: "https://other.statuspage.io" } }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page that no longer lists an API component is unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary({ components: [{ id: "a", name: "Frontend", status: "operational" }] }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no longer lists a component named "API"/.test(report.message ?? ""), report.message);
});

Deno.test("service: a broken status API says nothing about Streamtime", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: group containers are excluded, incidents are counted", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "g1", name: "Storage", status: "operational", group: true },
          { id: "c", name: "API", status: "operational", group: false },
        ],
        incidents: [{ id: "i1" }, { id: "i2" }],
        scheduled_maintenances: [{ id: "m1" }],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["c"]);
  assert(report.message?.includes("2 open incident(s)"), report.message);
  assert(report.message?.includes("1 scheduled maintenance window(s)"), report.message);
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
