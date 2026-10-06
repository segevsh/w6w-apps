import { assert, assertEquals } from "@std/assert";
import service, {
  isPublicApi,
  mapResourceStatus,
  PUBLIC_API_RESOURCE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const page = (apiStatus: string, other = "operational") => ({
  data: {
    type: "status_page",
    attributes: {
      company_name: "Hospitable",
      custom_domain: "status.hospitable.com",
      aggregate_state: "operational",
    },
  },
  included: [
    {
      id: PUBLIC_API_RESOURCE_ID,
      type: "status_page_resource",
      attributes: { public_name: "Public API", status: apiStatus },
    },
    {
      id: "1",
      type: "status_page_resource",
      attributes: { public_name: "Airbnb API", status: other },
    },
    { id: "2", type: "status_page_section", attributes: { name: "Developer Platform" } },
  ],
});

Deno.test("service: Public API operational is ok and the URL is the Better Stack JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).sort(), ["airbnb-api", "public-api"]);
});

Deno.test("service: only the Public API component drives the verdict", async () => {
  const other = mockCtx([{ body: page("operational", "downtime") }]);
  const r1 = await service.check!({}, other.ctx);
  assertEquals(r1.state, "ok");
  assertEquals(r1.components?.["airbnb-api"].state, "degraded");

  const down = mockCtx([{ body: page("downtime") }]);
  const r2 = await service.check!({}, down.ctx);
  assertEquals(r2.state, "down");
  assert(r2.message?.includes("downtime"));

  const deg = mockCtx([{ body: page("degraded") }]);
  assertEquals((await service.check!({}, deg.ctx)).state, "degraded");
});

Deno.test("service: unknown, never ok, when the page is not Hospitable's or lacks the component", async () => {
  const html = mockCtx([{ body: "<html></html>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");
  const foreign = page("operational");
  foreign.data.attributes.company_name = "Other";
  foreign.data.attributes.custom_domain = "status.other.example";
  const f = mockCtx([{ body: foreign }]);
  assertEquals((await service.check!({}, f.ctx)).state, "unknown");
  const missing = page("operational");
  missing.included = missing.included.slice(1, 2);
  const m = mockCtx([{ body: missing }]);
  assertEquals((await service.check!({}, m.ctx)).state, "unknown");
  const err = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await service.check!({}, err.ctx)).state, "unknown");
});

Deno.test("service: status mapping and component matching", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assert(isPublicApi({ id: PUBLIC_API_RESOURCE_ID }));
  assert(isPublicApi({ attributes: { public_name: " public api " } }));
  assertEquals(isPublicApi({ attributes: { public_name: "Public API v1" } }), false);
});

Deno.test("api: a JSON 401 auth error passes, from the body not the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const r = await api.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://public.api.hospitable.com/v2/user");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("api: HTML, 5xx and foreign JSON are not ok", async () => {
  const html = mockCtx([{ status: 401, body: "<html>edge</html>" }]);
  assertEquals((await api.check!({}, html.ctx)).state, "down");
  const five = mockCtx([{ status: 503, body: { message: "x" } }]);
  assertEquals((await api.check!({}, five.ctx)).state, "down");
  const foreign = mockCtx([{ status: 200, body: { ok: true } }]);
  assertEquals((await api.check!({}, foreign.ctx)).state, "unknown");
  const doc = mockCtx([{ status: 200, body: { data: {} } }]);
  assertEquals((await api.check!({}, doc.ctx)).state, "ok");
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("rate-limit header"));
  assertEquals(quota.check, undefined);
});
