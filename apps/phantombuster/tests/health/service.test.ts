import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { mapComponentStatus, mapIndicator, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = (indicator: string, components: Array<{ name: string; status: string }>) => ({
  page: { id: "xl1jfdffsz3j", name: "Phantombuster", url: "https://status.phantombuster.com" },
  components,
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator, description: indicator === "none" ? "All Systems Operational" : "Incident" },
});

test("service: fetches the real status URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: SUMMARY("none", []) }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

test("service: all-operational maps to ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: SUMMARY("none", [{ name: "Phantoms", status: "operational" }]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

test("service: a major outage maps to down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: SUMMARY("critical", [{ name: "API", status: "major_outage" }]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

test("service: an unreachable status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("service: a page that no longer self-identifies as PhantomBuster's is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.example.com" },
      components: [{ name: "X", status: "operational" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

test("mapIndicator: covers the documented page-level vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.phantombuster.com"]);
});
