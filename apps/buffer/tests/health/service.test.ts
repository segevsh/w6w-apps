import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT_NAME,
  componentState,
  DELIVERY_COMPONENT_NAME,
  findComponent,
  indicatorState,
  slug,
  STATUS_URL,
} from "../../health/service.ts";

const summary = (
  components: Array<{ name: string; status: string; group?: boolean }>,
  indicator = "none",
  description = "All Systems Operational",
) => ({
  body: {
    page: { id: "01JAQVAANK9BQ3TJ084A1V89HH", name: "Buffer", url: "https://status.buffer.com/" },
    status: { indicator, description },
    components: components.map((c, i) => ({ id: `c${i}`, ...c })),
    incidents: [],
    scheduled_maintenances: [],
  },
});

const HEALTHY = [
  { name: "Buffer API", status: "operational" },
  { name: "Publishing", status: "operational" },
  { name: "Analytics", status: "operational" },
  { name: "Login", status: "operational" },
  { name: "Instagram", status: "operational" },
];

Deno.test("service: probes Buffer's own status host, unauthenticated", async () => {
  const { ctx, calls } = mockCtx([summary(HEALTHY)]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(new URL(STATUS_URL).hostname, "status.buffer.com");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service: the check declares only the status host, and stays credential-free", () => {
  assertEquals(service.network?.allow, ["status.buffer.com"]);
  assertEquals(service.credential, undefined);
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

Deno.test("service: severity stays at the default degraded — Buffer is fully vendor-hosted", () => {
  // No self-hosted Buffer exists, so an API outage is true for every Connection.
  // The narrowing to one component is what makes that weight defensible.
  assertEquals(service.severity, undefined);
});

Deno.test("service: all operational is ok, and every component is reported", async () => {
  const { ctx } = mockCtx([summary(HEALTHY)]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "analytics",
    "buffer-api",
    "instagram",
    "login",
    "publishing",
  ]);
});

Deno.test("service: the verdict tracks Buffer API alone, not the global indicator", async () => {
  const { ctx } = mockCtx([
    summary(
      [
        { name: "Buffer API", status: "major_outage" },
        { name: "Login", status: "operational" },
      ],
      "none",
      "All Systems Operational",
    ),
  ]);
  const report = await service.check!({}, ctx);
  // The rollup says everything is fine; the component this app calls does not.
  assertEquals(report.state, "down");
});

Deno.test("service: a degraded Login does NOT degrade the app", async () => {
  const { ctx } = mockCtx([
    summary(
      [
        { name: "Buffer API", status: "operational" },
        { name: "Login", status: "major_outage" },
        { name: "Community", status: "major_outage" },
      ],
      "major",
      "Major Service Outage",
    ),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  // …but it is still visible, in both the components map and the message.
  assertEquals(report.components?.login?.state, "down");
  assert(/Major Service Outage/.test(report.message ?? ""), report.message);
});

/**
 * The judgement call, pinned: `Publishing` covers a queued post going out
 * later, which is a different failure from "will my API call work". Folding it
 * into the verdict would make the check answer a question a host could not
 * distinguish from the one it asked.
 */
Deno.test("service: Publishing is reported and named, but does not drive the verdict", async () => {
  const { ctx } = mockCtx([
    summary([
      { name: "Buffer API", status: "operational" },
      { name: "Publishing", status: "major_outage" },
    ]),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.publishing?.state, "down");
  assert(/Publishing/.test(report.message ?? ""), report.message);
  assert(/API calls are unaffected/.test(report.message ?? ""), report.message);
});

Deno.test("service: a per-network outage is attribution only", async () => {
  const { ctx } = mockCtx([
    summary([
      { name: "Buffer API", status: "operational" },
      { name: "Instagram", status: "major_outage" },
    ]),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.instagram?.state, "down");
});

Deno.test("service: a renamed API component falls back LOUDLY to the global indicator", async () => {
  const { ctx } = mockCtx([
    summary([{ name: "Core API", status: "operational" }], "minor", "Partially Degraded Service"),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/no `Buffer API` component/.test(report.message ?? ""), report.message);
});

Deno.test("service: group rows are skipped — they restate their children", async () => {
  const { ctx } = mockCtx([
    summary([
      { name: "Developer", status: "operational", group: true },
      { name: "Buffer API", status: "operational" },
    ]),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["buffer-api"]);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/503/.test(report.message ?? ""));
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>nope</html>" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page with no named components is unknown, not ok", async () => {
  const { ctx } = mockCtx([summary([])]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no named components/.test(report.message ?? ""));
});

Deno.test("service: incidents and maintenance windows are counted into the message", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Buffer", url: "https://status.buffer.com/" },
      status: { indicator: "minor", description: "Partially Degraded Service" },
      components: [{ id: "c0", name: "Buffer API", status: "degraded_performance" }],
      incidents: [{}, {}],
      scheduled_maintenances: [{}],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/2 open incident/.test(report.message ?? ""), report.message);
  assert(/1 scheduled maintenance/.test(report.message ?? ""), report.message);
});

Deno.test("service: the Statuspage vocabularies map as documented", () => {
  assertEquals(componentState("operational"), "ok");
  assertEquals(componentState("degraded_performance"), "degraded");
  assertEquals(componentState("partial_outage"), "degraded");
  assertEquals(componentState("under_maintenance"), "degraded");
  assertEquals(componentState("major_outage"), "down");
  assertEquals(componentState("something_new"), "unknown");
  assertEquals(indicatorState("none"), "ok");
  assertEquals(indicatorState("critical"), "down");
  assertEquals(indicatorState(undefined), "unknown");
});

Deno.test("service: component lookup is punctuation- and case-insensitive", () => {
  assertEquals(slug("Google Business profile"), "google-business-profile");
  const found = findComponent(
    [{ name: "buffer  api", status: "operational" }],
    API_COMPONENT_NAME,
  );
  assert(found, "case/spacing change should not lose the component");
  assertEquals(DELIVERY_COMPONENT_NAME, "Publishing");
});
