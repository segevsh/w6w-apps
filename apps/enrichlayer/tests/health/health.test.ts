import { assertEquals } from "@std/assert";
import service, { isEndpointComponent, STATUS_HOST } from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const comp = (name: string, status = 1, enabled = true) => ({ name, status, enabled });
const page = (...statuses: number[]) => ({
  data: [
    comp("Web", 4),
    ...statuses.map((s, i) => comp(`Company API • Thing ${i} Endpoint`, s)),
  ],
});

Deno.test("service: all endpoints operational is ok, and Web is ignored", async () => {
  const { ctx, calls } = mockCtx([{ body: page(1, 1) }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://status.enrichlayer.com/api/v1/components?per_page=100");
});

Deno.test("service: one slow endpoint is degraded and named; all-major-outage is down", async () => {
  const slow = await service.check!({}, mockCtx([{ body: page(1, 2) }]).ctx);
  assertEquals(slow.state, "degraded");
  assertEquals(slow.message, "impaired: Company API • Thing 1 Endpoint");
  assertEquals((await service.check!({}, mockCtx([{ body: page(1, 4) }]).ctx)).state, "degraded");
  assertEquals((await service.check!({}, mockCtx([{ body: page(4, 4) }]).ctx)).state, "down");
});

Deno.test("service: wrong shape, no endpoints, 5xx and HTML are unknown", async () => {
  for (
    const r of [
      { body: { data: [comp("Web")] } },
      { body: { errors: [{ status: 404 }] } },
      { status: 503, body: "x" },
      { headers: { "content-type": "text/html" }, body: "<html/>" },
    ]
  ) assertEquals((await service.check!({}, mockCtx([r]).ctx)).state, "unknown");
});

Deno.test("service: declares its own host, is informational, and filters components", () => {
  assertEquals(service.network?.allow, [STATUS_HOST]);
  assertEquals(service.severity, "informational");
  assertEquals(isEndpointComponent(comp("Search API • Person Search Endpoint")), true);
  assertEquals(isEndpointComponent(comp("Web")), false);
  assertEquals(isEndpointComponent(comp("Jobs API • Job Search Endpoint", 1, false)), false);
});

Deno.test("api: a schema-correct 401 is a pass", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://enrichlayer.com/api/v2/credit-balance");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: bare 401, 200, 5xx and a network error are not passes", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 401, body: "no" }]).ctx)).state,
    "degraded",
  );
  assertEquals((await api.check!({}, mockCtx([{ body: {} }]).ctx)).state, "degraded");
  assertEquals((await api.check!({}, mockCtx([{ status: 502, body: "x" }]).ctx)).state, "down");
  assertEquals((await api.check!({}, mockCtx([{ status: 404, body: "x" }]).ctx)).state, "degraded");
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} } as never;
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("quota: reports remaining credits; zero is degraded; junk is unknown", async () => {
  const ok = await quota.check!({}, mockCtx([{ body: { credit_balance: 42 } }]).ctx);
  assertEquals(ok.state, "ok");
  assertEquals(ok.quota, [{ id: "credits", remaining: 42, unit: "credits" }]);
  assertEquals(
    (await quota.check!({}, mockCtx([{ body: { credit_balance: 0 } }]).ctx)).state,
    "degraded",
  );
  assertEquals((await quota.check!({}, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
  assertEquals(quota.severity, "informational");
});
