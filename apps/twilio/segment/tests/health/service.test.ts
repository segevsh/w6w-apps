import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: kind service, unsigned, widens egress only to status.segment.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.segment.com"]);
});

Deno.test("service: maps a fully-operational summary to ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "Tracking API (US)", status: "operational" },
          { name: "Tracking API (EU)", status: "operational" },
          { name: "Data Ingestion", group: true, status: "operational" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.segment.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components?.["tracking-api-us"], { state: "ok" });
  assertEquals(report.components?.["tracking-api-eu"], { state: "ok" });
  // Group headers are skipped — they just restate their children's worst state.
  assertEquals(report.components?.["data-ingestion"], undefined);
});

Deno.test("service: maps a major incident to down", async () => {
  const { ctx } = mockCtx([
    { body: { status: { indicator: "major", description: "Partial outage" }, components: [] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: an unreachable status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
