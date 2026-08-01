import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: maps the healthy indicator and per-component status", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        page: { name: "Cal.com" },
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "App", status: "operational" },
          { name: "Website", status: "operational" },
          { name: "API", status: "operational" },
        ],
        incidents: [],
        scheduled_maintenances: [],
      },
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.cal.com/api/status/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.components?.app.state, "ok");
  assertEquals(report.components?.website.state, "ok");
  assertEquals(report.components?.api.state, "ok");
});

Deno.test("service: maps a degraded indicator and outage component", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "major", description: "Partial Outage" },
        components: [
          { name: "App", status: "operational" },
          { name: "API", status: "major_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message, "Partial Outage");
  assertEquals(report.components?.api.state, "down");
});

Deno.test("service: an unrecognized indicator/component value reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "something-new" },
        components: [{ name: "App", status: "something-new" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.components?.app.state, "unknown");
});

Deno.test("service: a failing status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
