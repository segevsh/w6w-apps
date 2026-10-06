import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { API_COMPONENT_ID, mapComponentStatus } from "../../health/service.ts";

const summary = (apiStatus = "operational", webhooks = "operational", pageId = "jxb4w0vdl2tv") => ({
  page: { id: pageId, name: "Procore Technologies" },
  status: { indicator: "none" },
  components: [
    { id: "unrelated", name: "Procore Community", status: "major_outage" },
    { id: API_COMPONENT_ID, name: "API Gateway", status: apiStatus },
    { id: "944dgf517gm9", name: "Webhooks", status: webhooks },
  ],
});

Deno.test("service: ok when API Gateway is operational, ignoring unrelated outages", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.procore.com/api/v2/summary.json");
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}), [API_COMPONENT_ID, "944dgf517gm9"]);
});

Deno.test("service: a major API Gateway outage is down", async () => {
  const { ctx } = mockCtx([{ body: summary("major_outage") }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message, "affected: API Gateway (major_outage)");
});

Deno.test("service: a Webhooks outage never worsens the verdict past detail", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "major_outage") }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["944dgf517gm9"].state, "degraded");
});

Deno.test("service: unknown when the page id or component has changed", async () => {
  const wrongPage = mockCtx([{ body: summary("operational", "operational", "other") }]);
  assertEquals((await service.check!({}, wrongPage.ctx)).state, "unknown");
  const noApi = mockCtx([{ body: { page: { id: "jxb4w0vdl2tv" }, components: [] } }]);
  assertEquals((await service.check!({}, noApi.ctx)).state, "unknown");
});

Deno.test("service: unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
  const garbage = mockCtx([{ body: "not json" }]);
  assertEquals((await service.check!({}, garbage.ctx)).state, "unknown");
});

Deno.test("service: maps Statuspage's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("service: declares its own status host and no credential", () => {
  assertEquals(service.network?.allow, ["status.procore.com"]);
  assertEquals(service.credential, "none");
});
