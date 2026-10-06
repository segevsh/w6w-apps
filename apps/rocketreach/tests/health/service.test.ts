import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (api: string, verify = "operational", extra: Record<string, unknown> = {}) => ({
  page: { id: PAGE_ID, name: "RocketReach" },
  status: { description: "All Systems Operational", indicator: "none" },
  components: [
    { id: "1", name: "RocketReach.co", status: "operational" },
    { id: "2", name: "Extension", status: "operational" },
    { id: "3", name: "API", status: api },
    { id: "4", name: "MCP", status: "operational" },
    { id: "5", name: "RocketReach Verify", status: verify },
  ],
  ...extra,
});

Deno.test("service: the API component decides; an unsigned call to the status host", async () => {
  const ok = mockCtx([{ body: summary("operational") }]);
  const res = await service.check!({}, ok.ctx);
  assertEquals(res.state, "ok");
  assertEquals(ok.calls[0].url, "https://status.rocketreach.co/api/v2/summary.json");
  assertEquals(service.network, { allow: ["status.rocketreach.co"] });
  assertEquals(service.credential, "none");
  const down = mockCtx([{ body: summary("major_outage") }]);
  assertEquals((await service.check!({}, down.ctx)).state, "down");
  const part = mockCtx([{ body: summary("partial_outage") }]);
  assertEquals((await service.check!({}, part.ctx)).state, "degraded");
});

Deno.test("service: Verify is capped at degraded and never makes the verdict down", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "major_outage") }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "degraded");
  assertEquals(res.components?.["rocketreach-verify"].state, "down");
  assertEquals(res.components?.["api"].state, "ok");
});

Deno.test("service: a decoy page, a failing page and a page without API are unknown", async () => {
  const decoy = mockCtx([{
    body: { ...summary("operational"), page: { id: "x", name: "Other" } },
  }]);
  assertEquals((await service.check!({}, decoy.ctx)).state, "unknown");
  const bad = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await service.check!({}, bad.ctx)).state, "unknown");
  const noApi = mockCtx([{
    body: { ...summary("operational"), components: [{ name: "Extension", status: "operational" }] },
  }]);
  assertEquals((await service.check!({}, noApi.ctx)).state, "unknown");
  const garbage = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await service.check!({}, garbage.ctx)).state, "unknown");
});

Deno.test("service: component status mapping", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("full_outage"), "down");
  assertEquals(mapComponentStatus("nonsense"), "unknown");
});
