import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  API_COMPONENT_NAME,
  findApiComponent,
  mapComponentStatus,
  mapIndicator,
  STATUS_HOST,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * A trimmed copy of the real 2026-09-22 body, keeping all seven live components
 * and the page's own id.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "bgttfstd0mbz", name: "Pennylane", url: "https://status.pennylane.com" },
    components: [
      {
        id: "c9ntgd50fyqs",
        name: "Application (app.pennylane.com)",
        status: "operational",
        group: false,
      },
      {
        id: "nm672smys1j9",
        name: "API (app.pennylane.com/api)",
        status: "operational",
        group: false,
      },
      { id: "dtcwfrlql57p", name: "Mobile application", status: "operational", group: false },
      {
        id: "6p29f82gjy1y",
        name: "Landing page (www.pennylane.com)",
        status: "operational",
        group: false,
      },
      {
        id: "ktv9hvslxk15",
        name: "Help Center (help.pennylane.com)",
        status: "operational",
        group: false,
      },
      {
        id: "lzn4f43zp5xp",
        name: "Academy (academy.pennylane.com)",
        status: "operational",
        group: false,
      },
      { id: "bsz8ll87ww42", name: "Customer support", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: the status URL is Pennylane's own claimed Statuspage", () => {
  assertEquals(STATUS_URL, "https://status.pennylane.com/api/v2/summary.json");
  assertEquals(STATUS_HOST, "status.pennylane.com");
  assertEquals(API_COMPONENT_ID, "nm672smys1j9");
  assertEquals(API_COMPONENT_NAME, "API (app.pennylane.com/api)");
});

Deno.test("service: component statuses map to the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: the page indicator maps separately from a component's status", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: the API component is found by id, then by exact name", () => {
  const byId = findApiComponent([
    { id: "other", name: "Renamed", status: "major_outage" },
    { id: API_COMPONENT_ID, name: "API (app.pennylane.com/api)", status: "operational" },
  ]);
  assertEquals(byId?.id, API_COMPONENT_ID);

  const byName = findApiComponent([
    { id: "new-id", name: "api (app.pennylane.com/api)", status: "operational" },
  ]);
  assertEquals(byName?.id, "new-id");

  // `Application (app.pennylane.com)` must never be mistaken for the API.
  assertEquals(
    findApiComponent([{ id: "c9ntgd50fyqs", name: "Application (app.pennylane.com)" }]),
    undefined,
  );
});

Deno.test("service: a fully operational page is ok, with every component reported as detail", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
  assertEquals(Object.keys(report.components ?? {}).length, 7);
  assertEquals(report.components?.[API_COMPONENT_ID], {
    state: "ok",
    message: "API (app.pennylane.com/api)",
  });
  assertEquals(report.ttlSeconds, 60);
});

Deno.test("service: an API outage is the verdict", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "major_outage", group: false },
          { id: "6p29f82gjy1y", name: "Landing page (www.pennylane.com)", status: "operational" },
        ],
        status: { indicator: "critical", description: "Partial System Outage" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.[API_COMPONENT_ID].state, "down");
  assert(report.message?.includes("API (app.pennylane.com/api): major_outage"), report.message);
});

Deno.test("service: a degraded API reads degraded and is named in the message", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "degraded_performance" },
        ],
        incidents: [{ name: "Elevated API latency", status: "investigating" }],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(report.message?.includes("degraded_performance"), report.message);
  assert(report.message?.includes("1 open incident(s)"), report.message);
});

Deno.test("service: a worse page indicator escalates the verdict, never the reverse", async () => {
  // The API component is healthy but Pennylane's own roll-up says critical —
  // something this component does not model is badly wrong, so caution wins.
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: API_COMPONENT_ID, name: API_COMPONENT_NAME, status: "operational" },
          { id: "6p29f82gjy1y", name: "Landing page (www.pennylane.com)", status: "major_outage" },
        ],
        status: { indicator: "critical", description: "Partial System Outage" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(report.message?.includes("page-level indicator"), report.message);
  assert(report.message?.includes("escalated from the roll-up"), report.message);
});

Deno.test("service: a minor page indicator degrades a healthy API reading", async () => {
  const { ctx } = mockCtx([
    { body: summary({ status: { indicator: "minor", description: "Degraded Performance" } }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failing = mockCtx([{ status: 503, body: undefined }]);
  assertEquals((await service.check!({}, failing.ctx)).state, "unknown");

  const unreadable = mockCtx([{ body: "<html>" }]);
  assertEquals((await service.check!({}, unreadable.ctx)).state, "unknown");
});

Deno.test("service: a status page that is no longer Pennylane's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary({ page: { name: "Other", url: "https://status.example.com" } }) },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no longer self-identifies"), report.message);
});

Deno.test("service: a page without the API component is unknown, not ok", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "c9ntgd50fyqs", name: "Application (app.pennylane.com)", status: "operational" },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(report.message?.includes("API (app.pennylane.com/api)"), report.message);
});

Deno.test("service: the probe is unsigned, app-scoped and only reaches the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.pennylane.com"]);
  assertEquals(service.minIntervalSeconds, 60);
});
