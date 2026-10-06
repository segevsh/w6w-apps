import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  mapComponentStatus,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-10-06 against www.raiselystatus.com. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: PAGE_ID, name: "Raisely", url: "https://www.raiselystatus.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "v5fsyj5lfytc", name: "Websites", status: "operational" },
      { id: "7cndq1dq35gz", name: "Donation & Payment Processing", status: "operational" },
      { id: API_COMPONENT_ID, name: "API", status: "operational" },
      { id: "kj21sf3s4y4j", name: "Admin Panel", status: "operational" },
    ],
    incidents: [],
    ...overrides,
  };
}

Deno.test("service: probes the final Statuspage host, unsigned", () => {
  assertEquals(STATUS_URL, "https://www.raiselystatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["www.raiselystatus.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an operational API component reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
});

Deno.test("service: an Admin Panel outage does not affect the verdict, only the API does", async () => {
  const body = summary();
  (body.components[3] as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}), [API_COMPONENT_ID]);
});

Deno.test("service: an API outage reports down, partial reports degraded", async () => {
  for (const [status, state] of [["major_outage", "down"], ["partial_outage", "degraded"]]) {
    const body = summary();
    body.components.find((c) => c.id === API_COMPONENT_ID)!.status = status;
    const { ctx } = mockCtx([{ body }]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, state);
    assert(/API:/.test(report.message ?? ""), report.message);
  }
});

Deno.test("service: open incidents are noted in the message", async () => {
  const { ctx } = mockCtx([{ body: summary({ incidents: [{ name: "x" }] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page that does not self-identify as Raisely is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { id: "other", name: "Someone Else" } }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a missing API component, a bad status or a bad body is unknown, never down", async () => {
  const noApi = summary({ components: [] });
  assertEquals((await service.check!({}, mockCtx([{ body: noApi }]).ctx)).state, "unknown");
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});

Deno.test("mapComponentStatus: the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});
