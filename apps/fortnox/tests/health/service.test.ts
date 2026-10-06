import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  LOGIN_COMPONENT_ID,
  mapComponentStatus,
  STATUS_PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = { id: STATUS_PAGE_ID, name: "Fortnox", url: "https://status.fortnox.se" };
const summary = (api: string, login = "operational", other = "operational") => ({
  page,
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { id: API_COMPONENT_ID, name: "Fortnox API", status: api },
    { id: LOGIN_COMPONENT_ID, name: "Fortnox ID", status: login },
    { id: "w3tymxjp465j", name: "Danske Bank", status: other },
  ],
});

Deno.test("service: probes the real Statuspage summary, unsigned, on its own host only", () => {
  assertEquals(STATUS_URL, "https://status.fortnox.se/api/v2/summary.json");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.fortnox.se"]);
});

Deno.test("mapComponentStatus: covers the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: operational API and login report ok with both components", async () => {
  const { ctx } = mockCtx([{ body: summary("operational") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).sort(), [API_COMPONENT_ID, LOGIN_COMPONENT_ID].sort());
});

Deno.test("service: an unrelated component being down does not affect the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "operational", "major_outage") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "ok");
});

Deno.test("service: API major outage is down; login partial outage is degraded", async () => {
  const a = mockCtx([{ body: summary("major_outage") }]);
  const down = await service.check!({} as never, a.ctx);
  assertEquals(down.state, "down");
  assert(down.message?.includes("Fortnox API (major_outage)"));
  const b = mockCtx([{ body: summary("operational", "partial_outage") }]);
  assertEquals((await service.check!({} as never, b.ctx)).state, "degraded");
});

Deno.test("service: a different page id, a missing API component or a bad body is unknown", async () => {
  const wrong = mockCtx([{ body: { ...summary("operational"), page: { ...page, id: "other" } } }]);
  assertEquals((await service.check!({} as never, wrong.ctx)).state, "unknown");
  const missing = mockCtx([{ body: { page, components: [] } }]);
  assertEquals((await service.check!({} as never, missing.ctx)).state, "unknown");
  const broken = mockCtx([{ body: "<html>", headers: {} }]);
  assertEquals((await service.check!({} as never, broken.ctx)).state, "unknown");
  const http = mockCtx([{ status: 503, body: {} }]);
  const r = await service.check!({} as never, http.ctx);
  assertEquals(r.state, "unknown");
  assertEquals(r.message, "Status page returned 503");
});
