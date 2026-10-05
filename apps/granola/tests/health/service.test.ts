import { assertEquals } from "@std/assert";
import service, { API_COMPONENT, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-10-05 (5 components, no `incidents` key). */
function summary(apiStatus = "operational", others = "operational") {
  return {
    page: { id: "01JE6FN0959TJMBCJJRTKEV8QC", name: "Granola", url: "https://status.granola.ai/" },
    status: { description: "All Systems Operational", indicator: "none" },
    components: [
      { id: "01JE6FN0D6VEAE5T2QNTPPEJHJ", name: "Desktop App", status: others },
      { id: "01M3C0PNXR6AJX3ZM7TSF0NYFY", name: API_COMPONENT, status: apiStatus },
      { id: "01M3C0PNXRQQSAK0G2Y4X641FY", name: "MCP", status: others },
    ],
  };
}

Deno.test("service: probes the status host, unauthenticated, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.granola.ai/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.granola.ai"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an operational API component reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
});

Deno.test("service: an incident on another product does not mark the API down", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "full_outage") }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: API component states map; full_outage is down", async () => {
  for (
    const [s, want] of [["degraded_performance", "degraded"], ["partial_outage", "degraded"], [
      "full_outage",
      "down",
    ], ["major_outage", "down"]]
  ) {
    const { ctx } = mockCtx([{ body: summary(s) }]);
    const r = await service.check!({}, ctx);
    assertEquals(r.state, want, s);
  }
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("service: a missing API component, bad status, or foreign page is unknown, never down", async () => {
  const noApi = summary();
  noApi.components = noApi.components.filter((c) => c.name !== API_COMPONENT);
  assertEquals((await service.check!({}, mockCtx([{ body: noApi }]).ctx)).state, "unknown");
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 500, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({}, mockCtx([{ body: "not json" }]).ctx)).state, "unknown");
  const foreign = summary();
  foreign.page.url = "https://status.other.com/";
  assertEquals((await service.check!({}, mockCtx([{ body: foreign }]).ctx)).state, "unknown");
});
