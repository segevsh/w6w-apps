import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reads the Statuspage summary.json on status.toggl.com", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: { indicator: "none" }, components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.toggl.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
});

Deno.test("service: a minor indicator maps to degraded", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "minor" }, components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: a major outage component is reported and escalates to down", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "major" },
      components: [{ name: "Track API", status: "major_outage" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["track-api"]?.state, "down");
});

Deno.test("service: group header components are skipped", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [{ name: "Parent", status: "operational", group: true }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components, {});
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
