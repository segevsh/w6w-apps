import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: service / app / none posture, widened only for the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.activecampaign.com"]);
});

Deno.test("service: maps Statuspage's indicator and per-component statuses", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "minor", description: "Partial API Degradation" },
      components: [
        { name: "API Availability", status: "degraded_performance" },
        { name: "Email", status: "operational" },
        { name: "US", status: "operational", group: true },
      ],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.activecampaign.com/api/v2/summary.json");
  assertEquals(result.state, "degraded");
  assertEquals(result.message, "Partial API Degradation");
  assertEquals(result.components?.["api-availability"]?.state, "degraded");
  assertEquals(result.components?.["email"]?.state, "ok");
  // Group headers are skipped.
  assertEquals(result.components?.["us"], undefined);
});

Deno.test("service: unknown (never down) when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
