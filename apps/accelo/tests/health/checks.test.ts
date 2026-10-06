import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import deployment from "../../health/deployment.ts";
import quota from "../../health/quota.ts";
import { mockAcceloCtx, mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (h: any, ctx: any) => h.check({}, ctx);

const summary = (indicator: string, id = "m0sbzc18yt4n") => ({
  page: { id, name: "Accelo" },
  components: [],
  status: { indicator, description: "d" },
});

Deno.test("service: maps the Statuspage indicator, pinned to Accelo's page id", async () => {
  for (
    const [ind, state] of [["none", "ok"], ["minor", "degraded"], ["major", "down"], [
      "critical",
      "down",
    ]]
  ) {
    const { ctx, calls } = mockCtx([{ body: summary(ind) }]);
    assertEquals((await run(service, ctx)).state, state);
    assertEquals(calls[0].url, "https://status.accelo.com/api/v2/summary.json");
  }
});

Deno.test("service: a different page, or a failing page, is unknown — never down", async () => {
  assertEquals(
    (await run(service, mockCtx([{ body: summary("major", "other") }]).ctx)).state,
    "unknown",
  );
  assertEquals((await run(service, mockCtx([{ status: 503, body: {} }]).ctx)).state, "unknown");
});

Deno.test("service: informational, unsigned, own egress", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.network?.allow, ["status.accelo.com"]);
});

Deno.test("deployment: Accelo's own 401 invalid_client passes (the host is serving)", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    status: 401,
    body: { meta: { status: "invalid_client", message: "no token" } },
  }]);
  assertEquals((await run(deployment, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tokeninfo");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("deployment: 400 Deployment not found, 5xx and transport failure are down", async () => {
  const gone = mockAcceloCtx([{
    status: 400,
    body: { meta: { status: "invalid_request", message: "Deployment 'acme' was not found." } },
  }]);
  const out = await run(deployment, gone.ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "Deployment 'acme' was not found.");
  assertEquals(
    (await run(deployment, mockAcceloCtx([{ status: 502, body: {} }]).ctx)).state,
    "down",
  );
  assertEquals((await run(deployment, mockAcceloCtx([]).ctx)).state, "down");
});

Deno.test("deployment: a 401 that is not Accelo's envelope is degraded; no deployment is unknown", async () => {
  assertEquals(
    (await run(deployment, mockAcceloCtx([{ status: 401, body: { x: 1 } }]).ctx)).state,
    "degraded",
  );
  assertEquals((await run(deployment, mockCtx([]).ctx)).state, "unknown");
});

Deno.test("quota: reads X-RateLimit-* headers; reset is a unix timestamp", async () => {
  const { ctx } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: {} },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4000",
      "x-ratelimit-reset": "1790000000",
    },
  }]);
  const out = await run(quota, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota[0], {
    id: "deployment",
    limit: 5000,
    remaining: 4000,
    resetAt: new Date(1790000000 * 1000).toISOString(),
    unit: "requests",
  });
});

Deno.test("quota: low headroom degrades, exhaustion is down, missing headers are unknown", async () => {
  const h = (remaining: string) => ({
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": remaining,
    },
  });
  assertEquals((await run(quota, mockAcceloCtx([h("100")]).ctx)).state, "degraded");
  assertEquals((await run(quota, mockAcceloCtx([h("0")]).ctx)).state, "down");
  assertEquals((await run(quota, mockAcceloCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals((await run(quota, mockAcceloCtx([{ status: 401, body: {} }]).ctx)).state, "unknown");
  assertEquals(quota.severity, "informational");
});
