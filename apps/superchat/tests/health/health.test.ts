import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service, {
  mapAggregateState,
  mapResourceStatus,
  resourceKey,
} from "../../health/service.ts";

const runApi = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);
const runService = (ctx: ReturnType<typeof mockCtx>["ctx"]) => service.check!({} as never, ctx);

Deno.test("api: unsigned app-level probe; the empty 401 is a pass", async () => {
  assertEquals([api.kind, api.credential, api.scope], ["dependency", "none", "app"]);
  const { ctx, calls } = mockCtx([{ status: 401, headers: {} }]);
  assertEquals((await runApi(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.superchat.com/v1.0/me");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api: 5xx is down, anything else is unknown", async () => {
  assertEquals((await runApi(mockCtx([{ status: 503, headers: {} }]).ctx)).state, "down");
  assertEquals((await runApi(mockCtx([{ status: 200, body: { user: {} } }]).ctx)).state, "unknown");
  assertEquals((await runApi(mockCtx([{ status: 404, headers: {} }]).ctx)).state, "unknown");
});

Deno.test("quota: declared absent at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(typeof quota.unavailable?.reason, "string");
});

const page = (aggregate: string, status = "operational", name = "SuperX GmbH") => ({
  data: {
    type: "status_page",
    attributes: {
      company_name: name,
      company_url: "https://superchat.de",
      custom_domain: "status.superchat.de",
      aggregate_state: aggregate,
    },
  },
  included: [
    { id: "1", type: "status_page_resource", attributes: { public_name: "API", status } },
    {
      id: "2",
      type: "status_page_resource",
      attributes: { public_name: "Webhook Infrastructure", status: "operational" },
    },
    { id: "3", type: "status_page_section", attributes: { name: "Backend" } },
  ],
});

Deno.test("service: declares a Better Stack probe of status.superchat.de, unsigned", () => {
  assertEquals([service.kind, service.credential, service.scope], ["service", "none", "app"]);
  assertEquals(service.network?.allow, ["status.superchat.de"]);
});

Deno.test("service: operational page is ok with one component per resource (sections skipped)", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  const r = await runService(ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}), ["api", "webhook-infrastructure"]);
  assertEquals(calls[0].url, "https://status.superchat.de/index.json");
});

Deno.test("service: a down resource and the aggregate drive the verdict and the message", async () => {
  const r = await runService(mockCtx([{ body: page("downtime", "downtime") }]).ctx);
  assertEquals(r.state, "down");
  assertEquals(r.components?.api.state, "down");
  assertEquals(r.message?.includes("API (downtime)"), true);
});

Deno.test("service: a page that is not Superchat's, a missing JSON, or a bad status is unknown, never down", async () => {
  const other = {
    ...page("operational"),
    data: {
      type: "status_page",
      attributes: { company_name: "Other Inc", aggregate_state: "operational" },
    },
  };
  assertEquals((await runService(mockCtx([{ body: other }]).ctx)).state, "unknown");
  assertEquals((await runService(mockCtx([{ body: { nope: 1 } }]).ctx)).state, "unknown");
  assertEquals((await runService(mockCtx([{ status: 500, headers: {} }]).ctx)).state, "unknown");
});

Deno.test("service: Better Stack vocabulary maps onto health states", () => {
  assertEquals(mapResourceStatus("operational"), "ok");
  assertEquals(mapResourceStatus("maintenance"), "degraded");
  assertEquals(mapResourceStatus("downtime"), "down");
  assertEquals(mapResourceStatus("weird"), "unknown");
  assertEquals(mapAggregateState("degraded"), "degraded");
  assertEquals(mapAggregateState(undefined), "unknown");
  assertEquals(resourceKey({ attributes: { public_name: "Review Seite" } }, 0), "review-seite");
});
