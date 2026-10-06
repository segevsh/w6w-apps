import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { API_COMPONENT_IDS, mapComponentStatus } from "../../health/service.ts";

const page = (a: string, b: string) => ({
  page: { name: "Egnyte Platform", url: "https://status.egnyte.com" },
  status: { indicator: "major" },
  components: [
    { id: "other", name: "Desktop App", status: "major_outage" },
    { id: API_COMPONENT_IDS[0], name: "Public APIs and Integrations", status: a },
    { id: API_COMPONENT_IDS[1], name: "Public APIs and Integrations", status: b },
  ],
});

Deno.test("service: ignores unrelated components and the page indicator", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational", "operational") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://status.egnyte.com/api/v2/summary.json");
  assertEquals(Object.keys(out.components ?? {}).sort(), [...API_COMPONENT_IDS].sort());
});

Deno.test("service: the worst of the two API components wins", async () => {
  const { ctx } = mockCtx([{ body: page("operational", "partial_outage") }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
  const b = mockCtx([{ body: page("major_outage", "operational") }]);
  assertEquals((await service.check!({}, b.ctx)).state, "down");
});

Deno.test("service: unknown, never down, when the page misbehaves", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 502, body: {} }]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
  const other = { page: { url: "https://status.other.com" }, components: [] };
  assertEquals((await service.check!({}, mockCtx([{ body: other }]).ctx)).state, "unknown");
  const none = { page: { url: "https://status.egnyte.com" }, components: [] };
  assertEquals((await service.check!({}, mockCtx([{ body: none }]).ctx)).state, "unknown");
});

Deno.test("mapComponentStatus: Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
