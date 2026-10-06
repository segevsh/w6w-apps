import { assert, assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  mapIndicator,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-10-06 (11 components, 2,572 bytes). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: PAGE_ID, name: "KlickTipp", url: "https://klicktipp-status.com/" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "01K9VN7091STB1NB2X4971Y4DS", name: "App", status: "operational" },
      { id: "01KB7DYXC0Z1M5QDX809RVX50C", name: "Login", status: "operational" },
      { id: "01KB7DVXYEB4YNAPQF5ASJ87ER", name: "API", status: "operational" },
      { id: "01KB7CY0ZZZJPV8295GK8ST7YP", name: "Landingpages", status: "operational" },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the true status host, which is not the API host", () => {
  assertEquals(STATUS_URL, "https://klicktipp-status.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["klicktipp-status.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: all operational is ok, with components keyed by vendor id", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(r.message, "All Systems Operational");
  assertEquals(r.components?.["01KB7DVXYEB4YNAPQF5ASJ87ER"]?.message, "API");
});

Deno.test("service: an API outage is down, and names the component", async () => {
  const body = summary({ status: { indicator: "major", description: "Partial System Outage" } });
  body.components[2].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assert(r.message!.includes("API (major_outage)"), r.message);
});

Deno.test("service: a Login incident degrades the verdict", async () => {
  const body = summary();
  body.components[1].status = "partial_outage";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a Landingpages incident is detail, not an API verdict", async () => {
  const body = summary({ status: { indicator: "minor", description: "Minor" } });
  body.components[3].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["01KB7CY0ZZZJPV8295GK8ST7YP"]?.state, "down");
});

Deno.test("service: without an API component it falls back to the indicator and says so", async () => {
  const body = summary({ status: { indicator: "critical", description: "Outage" } });
  body.components = body.components.filter((c) => c.name !== "API");
  const { ctx } = mockCtx([{ body }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assert(r.message!.includes("no API component"), r.message);
});

Deno.test("service: a page that no longer says KlickTipp, a broken feed, or no components is unknown", async () => {
  const other = mockCtx([{ body: summary({ page: { id: PAGE_ID, name: "Someone Else" } }) }]);
  assertEquals((await service.check!({}, other.ctx)).state, "unknown");
  const wrongId = mockCtx([{ body: summary({ page: { id: "X", name: "KlickTipp" } }) }]);
  assertEquals((await service.check!({}, wrongId.ctx)).state, "unknown");
  const err = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, err.ctx)).state, "unknown");
  const junk = mockCtx([{ body: "<html>" }]);
  assertEquals((await service.check!({}, junk.ctx)).state, "unknown");
  const empty = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");
});

Deno.test("service: vocabulary maps", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
