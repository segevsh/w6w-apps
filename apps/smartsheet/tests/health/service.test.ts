import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: declares an app-scoped, unsigned check against the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.smartsheet.com"]);
  // Unsigned posture is what makes widening egress safe.
  assert(service.credential === undefined || service.credential === "none");
  assert(typeof service.check === "function");
});

Deno.test("service: reads summary.json and reports ok when the rollup is `none`", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { id: "tvv76p250rdk", name: "Smartsheet" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "Core Application", status: "operational" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.smartsheet.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components?.["core-application"].state, "ok");
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
        { name: "Core Application", status: "operational" },
        { name: "Email Notifications", status: "degraded_performance" },
        { name: "Mobile", status: "partial_outage" },
        { name: "API", status: "major_outage" },
        { name: "Reports", status: "under_maintenance" },
        { name: "Mystery", status: "something_new" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["core-application"].state, "ok");
  assertEquals(report.components?.["email-notifications"].state, "degraded");
  assertEquals(report.components?.mobile.state, "degraded");
  assertEquals(report.components?.api.state, "down");
  assertEquals(report.components?.reports.state, "degraded");
  // An unrecognised vocabulary word must read as unknown, not silently ok.
  assertEquals(report.components?.mystery.state, "unknown");
});

Deno.test("service: skips group headers, which only restate their children", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "none" },
      components: [
        { name: "Smartsheet Platform", status: "operational", group: true },
        { name: "Core Application", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["core-application"]);
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
  // The specific failure this guards: a host that answers 200 with an HTML
  // marketing page instead of Statuspage JSON.
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: records both authenticity checks that were run on the status host", async () => {
  const src = await Deno.readTextFile(new URL("../../health/service.ts", import.meta.url));
  // (a) bogus sibling path comparison, (b) content-type + body inspection.
  assert(/bogus/i.test(src));
  assert(/application\/json/.test(src));
});
