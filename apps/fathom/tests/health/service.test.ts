import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.fathom.video"]);
  // `credential` defaults to "none" for kind "service" — never declared signed.
  assertEquals(service.credential, undefined);
});

Deno.test("service: maps the Statuspage indicator and per-component status", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "minor", description: "Partial Outage" },
        components: [
          { name: "In-Call Processing (Zoom)", status: "operational", group: false },
          { name: "Google Calendar Sync", status: "degraded_performance", group: false },
          { name: "Integrations", status: "degraded_performance", group: true },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.fathom.video/api/v2/summary.json");
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Partial Outage");
  assertEquals(report.components?.["in-call-processing-zoom"].state, "ok");
  assertEquals(report.components?.["google-calendar-sync"].state, "degraded");
  // Group headers are skipped — only leaf components are reported.
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: an all-clear page reports ok", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [{ name: "Recording Processing", status: "operational" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["recording-processing"].state, "ok");
});

Deno.test("service: major and critical outages map to down", async () => {
  for (const indicator of ["major", "critical"]) {
    const { ctx } = mockCtx([{ status: 200, body: { status: { indicator }, components: [] } }]);
    assertEquals((await service.check!({}, ctx)).state, "down", indicator);
  }
});

Deno.test("service: a failing status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised indicator reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: { indicator: "wat" } } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised component status reports unknown for that component", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "none" },
        components: [{ name: "API", status: "brand_new_state" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.api.state, "unknown");
});
