import { assertEquals } from "@std/assert";
import service, { mapResourceStatus, PAGE_ID, RESOURCE_NAME } from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const page = (status: string, id = PAGE_ID, company = "FullEnrich", name = RESOURCE_NAME) => ({
  data: { id, attributes: { company_name: company } },
  included: [{ type: "status_page_resource", attributes: { public_name: name, status } }],
});

Deno.test("service: operational web app is ok; downtime is capped at degraded", async () => {
  const ok = mockCtx([{ body: page("operational") }]);
  assertEquals((await service.check!({}, ok.ctx)).state, "ok");
  assertEquals(ok.calls[0].url, "https://status.fullenrich.com/index.json");
  assertEquals(
    (await service.check!({}, mockCtx([{ body: page("downtime") }]).ctx)).state,
    "degraded",
  );
});

Deno.test("service: wrong page, missing resource, 5xx and HTML are unknown", async () => {
  for (
    const r of [
      { body: page("operational", "1") },
      { body: page("operational", PAGE_ID, "Acme") },
      { body: page("operational", PAGE_ID, "FullEnrich", "other") },
      { status: 503, body: "x" },
      { headers: { "content-type": "text/html" }, body: "<html/>" },
    ]
  ) assertEquals((await service.check!({}, mockCtx([r]).ctx)).state, "unknown");
});

Deno.test("service: declares its own host, informational severity, and a status mapping", () => {
  assertEquals(service.network?.allow, ["status.fullenrich.com"]);
  assertEquals(service.severity, "informational");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("???"), "unknown");
});

Deno.test("api: a schema-correct 401 is ok; HTML, 200 and 5xx are not", async () => {
  const body = { code: "error.authorization.not_set", message: "Authorization headers not set" };
  const ok = mockCtx([{ status: 401, body }]);
  assertEquals((await api.check!({}, ok.ctx)).state, "ok");
  assertEquals(ok.calls[0].url, "https://app.fullenrich.com/api/v2/account/credits");
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 401, body: "<html/>" }]).ctx)).state,
    "degraded",
  );
  assertEquals((await api.check!({}, mockCtx([{ status: 200, body: {} }]).ctx)).state, "degraded");
  assertEquals((await api.check!({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
});

Deno.test("api: a network failure is down", async () => {
  const { ctx } = mockCtx([]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("quota: reports the credit balance", async () => {
  const ok = mockCtx([{ body: { balance: 120 } }]);
  const r = await quota.check!({}, ok.ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 120, unit: "credits" }]);
  const zero = await quota.check!({}, mockCtx([{ body: { balance: 0 } }]).ctx);
  assertEquals(zero.state, "degraded");
  assertEquals((await quota.check!({}, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals((await quota.check!({}, mockCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
});
