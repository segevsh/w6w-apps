import { assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  mapComponentStatus,
  mapIndicator,
  PAGE_ID,
  STATUS_URL,
} from "../health/service.ts";
import api from "../health/api.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

const summary = (apiStatus: string, storefront = "operational", indicator = "none") => ({
  page: { id: PAGE_ID, name: "Uscreen" },
  status: { indicator },
  components: [
    { id: "g", name: "API", status: "operational", group: true },
    { id: API_COMPONENT_ID, name: "API V1", status: apiStatus, group: false },
    { id: "s", name: "Storefront", status: storefront, group: false },
  ],
});

// deno-lint-ignore no-explicit-any
const run = (h: any, ctx: any) => h.check({}, ctx);

Deno.test("health.service: verdict is the API V1 component's, not the page roll-up", async () => {
  const web = mockCtx([{ body: summary("operational", "major_outage", "critical") }]);
  assertEquals((await run(service, web.ctx)).state, "ok");
  assertEquals(web.calls[0].url, STATUS_URL);

  const down = mockCtx([{ body: summary("major_outage") }]);
  const r = await run(service, down.ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message, "affected: API V1 (major_outage)");
});

Deno.test("health.service: wrong page id, bad status or unreadable body is unknown", async () => {
  const other = { ...summary("operational"), page: { id: "zzz", name: "Uscreen" } };
  assertEquals((await run(service, mockCtx([{ body: other }]).ctx)).state, "unknown");
  assertEquals((await run(service, mockCtx([{ status: 500, body: "x" }]).ctx)).state, "unknown");
  assertEquals((await run(service, mockCtx([{ body: "not json" }]).ctx)).state, "unknown");
  assertEquals(
    (await run(service, mockCtx([{ body: { page: { id: PAGE_ID }, components: [] } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("health.service: falls back to the indicator when API V1 is absent; vocab maps", async () => {
  const noApi = {
    page: { id: PAGE_ID },
    status: { indicator: "minor" },
    components: [{ id: "s", name: "Storefront", status: "operational" }],
  };
  assertEquals((await run(service, mockCtx([{ body: noApi }]).ctx)).state, "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("weird"), "unknown");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("health.api: a schema-correct 401 from the unsigned probe is a pass", async () => {
  const ok = mockCtx([{ status: 401, body: { message: "Missing private API key" } }]);
  assertEquals((await run(api, ok.ctx)).state, "ok");
  assertEquals(ok.calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("health.api: 5xx, HTML shells and foreign JSON are not a pass", async () => {
  assertEquals(
    (await run(api, mockCtx([{ status: 503, body: { message: "x" } }]).ctx)).state,
    "down",
  );
  assertEquals((await run(api, mockCtx([{ status: 200, body: "<html>" }]).ctx)).state, "down");
  assertEquals((await run(api, mockCtx([{ body: { hello: 1 } }]).ctx)).state, "unknown");
});

Deno.test("health.quota: a declared informational absence", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
});
