import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: maps the Statuspage indicator and per-component status", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "minor", description: "Partial Outage" },
        components: [
          { name: "Web App", status: "operational", group: false },
          { name: "Inbox API", status: "degraded_performance", group: false },
          { name: "Region: Group", status: "degraded_performance", group: true },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.helpscout.com/api/v2/summary.json");
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["web-app"].state, "ok");
  assertEquals(report.components?.["inbox-api"].state, "degraded");
  // Group headers are skipped — only leaf components are reported.
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: a failing status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unrecognized indicator/status also reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: {}, components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
