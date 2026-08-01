import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: indicator 'none' with operational groups -> ok", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "g1", name: "Redis Global", status: "operational", group: true },
        { id: "r1", name: "N. Virginia, USA", status: "operational", group: false },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components, { g1: { state: "ok", message: "Redis Global" } });
  assertEquals(calls[0].url, "https://status.upstash.com/api/v2/summary.json");
});

Deno.test("service: indicator 'critical' -> down", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "critical", description: "Major outage" },
      components: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: non-2xx status API response -> unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: undefined }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
