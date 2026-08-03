import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (components: Array<[string, string]>, indicator = "none", description = "OK") => ({
  page: { id: "f07lhm8ppnp0", name: "Follow Up Boss" },
  status: { indicator, description },
  components: components.map(([name, status]) => ({ name, status })),
});

const FULL: Array<[string, string]> = [
  ["Follow Up Boss Web Application", "operational"],
  ["API", "operational"],
  ["iPhone App", "operational"],
  ["Android App", "operational"],
  ["Follow Up Boss Public Website", "operational"],
];

Deno.test("service: unsigned, app-scoped, and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  // Both default for kind "service"; asserted so a later edit cannot silently
  // send a credential to a third-party status host.
  assertEquals(service.credential ?? "none", "none");
  assertEquals(service.scope ?? "app", "app");
  assertEquals(service.network?.allow, ["followupboss.statuspage.io"]);
  // Left at the kind default — see the module comment for why this one is not
  // informational.
  assertEquals(service.severity, undefined);
});

Deno.test("service: reports ok when the API component is operational", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary(FULL) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(
    calls[0].url,
    "https://followupboss.statuspage.io/api/v2/summary.json",
  );
  assertEquals(Object.keys(report.components ?? {}).length, 5);
  assertEquals(report.components?.["api"].state, "ok");
});

/**
 * The whole point of keying on the API component: an outage of a surface this
 * app never calls must not degrade every tenant's workflows.
 */
Deno.test("service: a mobile-app outage does NOT degrade the reported state", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [
        ["Follow Up Boss Web Application", "operational"],
        ["API", "operational"],
        ["iPhone App", "major_outage"],
        ["Android App", "major_outage"],
        ["Follow Up Boss Public Website", "operational"],
      ],
      "major",
      "Mobile apps unavailable",
    ),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok", "a mobile outage must not degrade API workflows");
  // …but it is still visible to an operator in the component breakdown.
  assertEquals(report.components?.["iphone-app"].state, "down");
  assertEquals(report.components?.["android-app"].state, "down");
});

Deno.test("service: an API outage IS reported as down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [["API", "major_outage"], ["iPhone App", "operational"]],
      "major",
      "API unavailable",
    ),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("major_outage"), report.message);
});

Deno.test("service: degraded API performance maps to degraded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([["API", "degraded_performance"]], "minor", "Degraded"),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: maintenance on the API reads as degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([["API", "under_maintenance"]], "minor", "Maintenance"),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: falls back to the rollup — and says so — if the API component vanishes", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary([["iPhone App", "operational"]], "minor", "Partial degradation"),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes('no "API" component'), report.message);
  assert(report.message?.includes("Partial degradation"), report.message);
});

Deno.test("service: group headers are skipped, not counted as components", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "none", description: "OK" },
      components: [
        { name: "Platform", status: "operational", group: true },
        { name: "API", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["api"]);
});

/**
 * A status page that is itself broken says nothing about the vendor. Reporting
 * that as an outage would be a lie.
 */
Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("503"), report.message);
});

Deno.test("service: unparseable JSON reports unknown rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised component status reads as unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary([["API", "invented_status"]]) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
