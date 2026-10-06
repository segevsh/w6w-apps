import { assert, assertEquals } from "@std/assert";
import service, {
  API_RESOURCE_ID,
  mapResourceStatus,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: STATUS_URL is Better Stack's own JSON document, not a Statuspage guess", () => {
  assertEquals(STATUS_URL, "https://status.leexi.ai/index.json");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.leexi.ai"] });
});

Deno.test("mapResourceStatus: maps Better Stack's vocabulary", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("resolved"), "ok");
  assertEquals(mapResourceStatus("degraded"), "degraded");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("down"), "down");
  assertEquals(mapResourceStatus(undefined), "unknown");
  assertEquals(mapResourceStatus("something-new"), "unknown");
});

function page(web: string, apiStatus: string, over: { id?: string; name?: string } = {}) {
  return {
    data: {
      id: over.id ?? PAGE_ID,
      type: "status_page",
      attributes: { company_name: over.name ?? "Leexi", custom_domain: "status.leexi.ai" },
    },
    included: [
      {
        id: "8460282",
        type: "status_page_resource",
        attributes: { public_name: "leexi.ai", status: web },
      },
      {
        id: API_RESOURCE_ID,
        type: "status_page_resource",
        attributes: { public_name: "api.leexi.ai", status: apiStatus },
      },
      {
        id: "226744",
        type: "status_page_section",
        attributes: { name: "Current status by service" },
      },
    ],
  };
}

Deno.test("service.check: all operational is ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational", "operational") }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(Object.keys(res.components!).sort(), ["api-leexi-ai", "leexi-ai"]);
  assertEquals(res.message, undefined);
});

Deno.test("service.check: the API resource decides — its downtime is down", async () => {
  const { ctx } = mockCtx([{ body: page("operational", "downtime") }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "down");
  assert(res.message!.includes("api.leexi.ai (downtime)"));
});

Deno.test("service.check: the web app being down only degrades", async () => {
  const { ctx } = mockCtx([{ body: page("downtime", "operational") }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service.check: a non-200 page is unknown, never down", async () => {
  assertEquals((await service.check!({}, mockCtx([{ status: 503 }]).ctx)).state, "unknown");
});

Deno.test("service.check: a catch-all HTML body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "unknown");
  assert(res.message!.includes("/index.json"));
});

Deno.test("service.check: someone else's page is unknown", async () => {
  const { ctx } = mockCtx([{
    body: page("operational", "operational", { id: "1", name: "Acme" }),
  }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "unknown");
  assert(res.message!.includes("not Leexi's"));
});

Deno.test("service.check: a page with no api resource is unknown", async () => {
  const body = page("operational", "operational");
  body.included = body.included.filter((r) => r.id !== API_RESOURCE_ID);
  const res = await service.check!({}, mockCtx([{ body }]).ctx);
  assertEquals(res.state, "unknown");
});
