import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  mapIndicator,
  PUBLIC_API_COMPONENT_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-29 (15 flat components, no groups). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "01HNJQPD4DM0R7V037MC6RCS61",
      name: "Otter.ai",
      url: "https://status.otter.ai/",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "01HNJQPDH84MW1E8A93PHK086T", name: "Otter Website", status: "operational" },
      { id: PUBLIC_API_COMPONENT_ID, name: "Public API", status: "operational" },
      { id: "01HNJQPDH88A4P69MK0BBE8QXC", name: "Otter Chat", status: "operational" },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.otter.ai/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.otter.ai"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: components are keyed by the vendor's stable id", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.components?.[PUBLIC_API_COMPONENT_ID]?.message, "Public API");
});

Deno.test("service: a Public API outage is named explicitly in the message", async () => {
  const body = summary({ status: { indicator: "major", description: "Partial System Outage" } });
  (body.components[1] as { status: string }).status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  // Statuspage's page-level indicator caps at "degraded" for anything short
  // of `critical` — see `mapIndicator`.
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("Public API: major_outage"), true);
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "gateway error" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a redirect to an unclaimed page is unknown, not trusted", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { url: "https://example.com/" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers Statuspage's page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
