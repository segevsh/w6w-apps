import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: maps the Statuspage indicator and per-component status", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "API", status: "operational", group: false },
          { name: "Group header", status: "operational", group: true },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.api.state, "ok");
  assertEquals(report.components?.["group-header"], undefined);
});

Deno.test("service: a major outage maps to down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: { indicator: "major" }, components: [] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a non-ok status API response reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
