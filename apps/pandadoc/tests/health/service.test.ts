import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.pandadoc.com"]);
  // `credential` defaults to "none" for kind "service" — never declared signed.
  assertEquals(service.credential, undefined);
});

Deno.test("service: maps the Statuspage indicator and namespaces components by group", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        status: { indicator: "minor", description: "Partial Outage" },
        components: [
          { id: "g1", name: "US & Global", status: "operational", group: true },
          { id: "g2", name: "EU", status: "degraded_performance", group: true },
          { id: "c1", name: "API", status: "operational", group: false, group_id: "g1" },
          { id: "c2", name: "API", status: "major_outage", group: false, group_id: "g2" },
          { id: "c3", name: "Webhooks", status: "partial_outage", group: false, group_id: "g1" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.pandadoc.com/api/v2/summary.json");
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Partial Outage");
  // Same component name in two groups must NOT collapse into one key.
  assertEquals(report.components?.["us-global/api"].state, "ok");
  assertEquals(report.components?.["eu/api"].state, "down");
  assertEquals(report.components?.["us-global/webhooks"].state, "degraded");
  // Group headers are never reported themselves.
  assertEquals(Object.keys(report.components ?? {}).length, 3);
});

Deno.test("service: an ungrouped component keeps its bare slug", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [{ id: "c1", name: "Web application", status: "operational" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["web-application"].state, "ok");
});

Deno.test("service: major and critical map to down", async () => {
  for (const indicator of ["major", "critical"]) {
    const { ctx } = mockCtx([{ body: { status: { indicator }, components: [] } }]);
    assertEquals((await service.check!({}, ctx)).state, "down", indicator);
  }
});

Deno.test("service: an unrecognised component status is unknown, not ok", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "none" },
        components: [{ id: "c1", name: "API", status: "who_knows" }],
      },
    },
  ]);
  assertEquals((await service.check!({}, ctx)).components?.api.state, "unknown");
});

Deno.test("service: a failing status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised indicator reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "wat" } } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
