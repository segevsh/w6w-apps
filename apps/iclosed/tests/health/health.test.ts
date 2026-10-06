import { assert, assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import service, {
  API_COMPONENT_ID,
  mapComponentStatus,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { KEY_REQUIRED, mockCtx } from "../_helpers.ts";

Deno.test("api: probes GET /v1/users unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: KEY_REQUIRED }]);
  await api.check!({} as never, ctx);
  assertEquals(PROBE_URL, "https://public.api.iclosed.io/v1/users");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("api: the schema-correct 401 is a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: KEY_REQUIRED }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.message, undefined);
});

Deno.test("api: other outcomes", async () => {
  const cases: Array<[number, unknown, string]> = [
    [401, { message: "something else" }, "unknown"],
    [404, { message: "Not found" }, "down"],
    [429, { code: "RATE_LIMIT_EXCEEDED" }, "degraded"],
    [503, { message: "x" }, "down"],
    [200, { data: {} }, "unknown"],
  ];
  for (const [status, body, state] of cases) {
    const { ctx } = mockCtx([{ status, body }]);
    assertEquals((await api.check!({} as never, ctx)).state, state, String(status));
  }
});

Deno.test("api: a non-JSON body is down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: {} }]);
  assertEquals((await api.check!({} as never, ctx)).state, "down");
});

const summary = (api: string, app = "operational", billing = "operational", pageId = PAGE_ID) => ({
  page: { id: pageId, name: "iClosed", url: "https://status.iclosed.io/" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { id: "w", name: "iClosed Website", status: "operational" },
    { id: "a", name: "iClosed App", status: app },
    { id: API_COMPONENT_ID, name: "iClosed API", status: api },
    { id: "b", name: "Billing API", status: billing },
  ],
});

Deno.test("service: reads the status page unsigned from the declared host", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).length, 4);
  assertEquals(service.network?.allow, ["status.iclosed.io"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: only the API component decides, others cap at degraded", async () => {
  let c = mockCtx([{ body: summary("major_outage") }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "down");
  c = mockCtx([{ body: summary("operational", "major_outage", "partial_outage") }]);
  const out = await service.check!({} as never, c.ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["a"].state, "degraded");
  assert(out.message?.includes("iClosed App"));
  c = mockCtx([{ body: summary("degraded_performance") }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "degraded");
});

Deno.test("service: a foreign page, a missing API component or a bad body is unknown", async () => {
  let c = mockCtx([{ body: summary("operational", "operational", "operational", "other") }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "unknown");
  const noApi = summary("operational");
  noApi.components = noApi.components.filter((x) => x.id !== API_COMPONENT_ID);
  c = mockCtx([{ body: noApi }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "unknown");
  c = mockCtx([{ status: 500, body: {} }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "unknown");
  c = mockCtx([{ body: "not json", headers: {} }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "unknown");
  c = mockCtx([{ body: { page: { id: PAGE_ID }, components: [] } }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "unknown");
});

Deno.test("service: component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("X-RateLimit"));
  assertEquals(quota.check, undefined);
});
