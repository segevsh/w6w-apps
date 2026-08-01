import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: kind service, unsigned, widens egress only to status.customerio.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.customerio.com"]);
});

Deno.test("service: maps a fully-operational summary to ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "Data Collection", status: "operational" },
          { name: "Message Sending", status: "operational" },
          { name: "Third-Party Services", group: true, status: "operational" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.customerio.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components?.["data-collection"], { state: "ok" });
  assertEquals(report.components?.["message-sending"], { state: "ok" });
  // Group headers are skipped — they just restate their children's worst state.
  assertEquals(report.components?.["third-party-services"], undefined);
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
