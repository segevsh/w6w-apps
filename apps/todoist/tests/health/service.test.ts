import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reads Instatus /summary.json on status.todoist.net", async () => {
  const { ctx, calls } = mockCtx([{ body: { page: { status: "UP" } } }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.todoist.net/summary.json");
  assertEquals(report.state, "ok");
});

Deno.test("service: HASISSUES maps to degraded", async () => {
  const { ctx } = mockCtx([{ body: { page: { status: "HASISSUES" } } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a major outage incident escalates to down with a component", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { status: "HASISSUES" },
      activeIncidents: [{ name: "Sync API outage", impact: "MAJOROUTAGE" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["sync-api-outage"]?.state, "down");
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
