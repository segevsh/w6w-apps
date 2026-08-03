import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: declares an app-scoped, unsigned check against the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.close.com"]);
  // Unsigned posture is what makes widening egress safe.
  assert(service.credential === undefined || service.credential === "none");
  assert(typeof service.check === "function");
});

Deno.test("service: reads summary.json and reports ok when the rollup is `none`", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "API", status: "operational" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.close.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components?.api.state, "ok");
});

Deno.test("service: maps every Statuspage rollup indicator", async () => {
  const cases: Array<[string, string]> = [
    ["none", "ok"],
    ["minor", "degraded"],
    ["major", "down"],
    ["critical", "down"],
    ["not-a-real-indicator", "unknown"],
  ];
  for (const [indicator, expected] of cases) {
    const { ctx } = mockCtx([{ status: 200, body: { status: { indicator } } }]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, expected, indicator);
  }
});

Deno.test("service: maps every per-component status", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "minor" },
      components: [
        { name: "API", status: "operational" },
        { name: "Email Sending", status: "degraded_performance" },
        { name: "Calling", status: "partial_outage" },
        { name: "Application", status: "major_outage" },
        { name: "Search", status: "under_maintenance" },
        { name: "Mystery", status: "something_new" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.api.state, "ok");
  assertEquals(report.components?.["email-sending"].state, "degraded");
  assertEquals(report.components?.calling.state, "degraded");
  assertEquals(report.components?.application.state, "down");
  assertEquals(report.components?.search.state, "degraded");
  // An unrecognised vocabulary word must read as unknown, not silently ok.
  assertEquals(report.components?.mystery.state, "unknown");
});

Deno.test("service: skips group headers, which only restate their children", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "none" },
      components: [
        { name: "Core Platform", status: "operational", group: true },
        { name: "API", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["api"]);
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  // A status API that itself fails says nothing about the vendor — calling that
  // an outage would be a lie.
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("503"));
});

Deno.test("service: unparseable JSON degrades to unknown rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
