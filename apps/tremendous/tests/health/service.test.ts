import { assertEquals } from "@std/assert";
import service, { mapStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapStatus: known-good values map to ok", () => {
  assertEquals(mapStatus("UP"), "ok");
  assertEquals(mapStatus("OPERATIONAL"), "ok");
  assertEquals(mapStatus("up"), "ok");
});

Deno.test("mapStatus: keyword fallback for unconfirmed enum values", () => {
  assertEquals(mapStatus("MAJOROUTAGE"), "down");
  assertEquals(mapStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapStatus("PARTIALOUTAGE"), "down"); // contains OUTAGE, checked before DEGRADED/PARTIAL
  assertEquals(mapStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapStatus(undefined), "unknown");
  assertEquals(mapStatus("SOMETHING_NEW"), "unknown");
});

Deno.test("service.check: reports ok with no active incidents", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { name: "Tremendous", url: "https://status.tremendous.com", status: "UP" },
      activeIncidents: [],
    },
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(new URL(calls[0].url).hostname, "status.tremendous.com");
});

Deno.test("service.check: surfaces an active incident's name and impact", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { name: "Tremendous", url: "https://status.tremendous.com", status: "UP" },
      activeIncidents: [{
        name: "Delays adding some Visa cards to digital wallets",
        status: "INVESTIGATING",
        impact: "DEGRADEDPERFORMANCE",
      }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.message?.includes("Delays adding some Visa cards"), true);
});

Deno.test("service.check: a page that no longer self-identifies as Tremendous is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { page: { name: "Someone Else", url: "https://status.example.com", status: "UP" } },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
