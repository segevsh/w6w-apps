import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: declares the Workspace dashboard, unsigned, polled at 120s", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["www.google.com"]);
  assertEquals(service.minIntervalSeconds, 120);
});

Deno.test("service: ok when no OPEN Google Meet incident exists", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [
        // Open, but a different Workspace product — must not count for Meet.
        { service_name: "Google Calendar", external_desc: "Calendar is down" },
        // Google Meet, but resolved — the feed is history, so this is over.
        { service_name: "Google Meet", external_desc: "old", end: "2026-01-01T00:00:00Z" },
      ],
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls[0].url, "https://www.google.com/appsstatus/dashboard/incidents.json");
});

Deno.test("service: maps an open SERVICE_OUTAGE to down (case-insensitive service_name)", async () => {
  const { ctx } = mockCtx([
    {
      body: [
        {
          service_name: "google meet",
          status_impact: "SERVICE_OUTAGE",
          external_desc: "Meet is down",
        },
      ],
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assertEquals(result.message, "Meet is down");
});

Deno.test("service: SERVICE_DISRUPTION maps to degraded", async () => {
  const { ctx } = mockCtx([
    { body: [{ service_name: "Google Meet", status_impact: "SERVICE_DISRUPTION" }] },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("service: unknown when the dashboard itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: unknown when the dashboard returns an unexpected shape", async () => {
  const { ctx } = mockCtx([{ body: { not: "an array" } }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
