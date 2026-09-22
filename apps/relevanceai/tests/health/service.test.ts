import { assert, assertEquals } from "@std/assert";
import service, { isApiComponent, slug, STATE, STATUS_URL } from "../../health/service.ts";
import { mockCtx, statusPage, statusResource } from "../_helpers.ts";

function withStatus(publicName: string, status: string, explicit: string | null = null) {
  const page = statusPage();
  const included = page.included as Array<Record<string, unknown>>;
  for (const entry of included) {
    const attrs = entry.attributes as Record<string, unknown>;
    if (attrs.public_name === publicName) {
      attrs.status = status;
      attrs.explicit_status = explicit;
    }
  }
  return page;
}

Deno.test("service: probes the status host, not the API host, and is unsigned", () => {
  assertEquals(STATUS_URL, "https://status.relevanceai.com/index.json");
  assertEquals(service.network?.allow, ["status.relevanceai.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

Deno.test("service: an all-operational page reports ok and names the three API components", async () => {
  const { ctx, calls } = mockCtx([{ body: statusPage() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}), ["au-api", "eu-api", "us-api"]);
  assertEquals(report.components?.["au-api"]?.message, "AU API");
  assertEquals(report.message, "AU API, EU API, US API operational");
});

/**
 * The page's other 28 resources — Agent Builder, Chat, OpenAI, Anthropic,
 * WorkOS, Serper, Modal, Orb Billing, Pipedream — describe things this app does
 * not call. Reporting them would let an OpenAI outage speak for Relevance AI's
 * API.
 */
Deno.test("service: only the `* API` components are reported", async () => {
  const { ctx } = mockCtx([{ body: statusPage() }]);
  const report = await service.check!({}, ctx);

  const keys = Object.keys(report.components ?? {});
  assertEquals(keys.length, 3);
  for (const excluded of ["chat", "agent-builder", "openai", "anthropic", "orb-billing"]) {
    assertEquals(keys.includes(excluded), false, `unrelated component ${excluded} was reported`);
  }
  // "Orb Billing" is the trap a substring match on the vendor's name would catch.
  assertEquals(isApiComponent("Orb Billing"), false);
  assertEquals(isApiComponent("AU API"), true);
  assertEquals(isApiComponent("API"), false);
  assertEquals(isApiComponent(undefined), false);
});

Deno.test("service: the page-wide aggregate is NOT the verdict", async () => {
  const page = statusPage();
  // An unrelated provider is down, so the page's own roll-up says"downtime"…
  (page.data as { attributes: Record<string, unknown> }).attributes.aggregate_state = "downtime";
  (page.included as Array<Record<string, unknown>>)[5].attributes = {
    public_name: "OpenAI",
    status: "downtime",
    explicit_status: null,
  };

  const { ctx } = mockCtx([{ body: page }]);
  const report = await service.check!({}, ctx);
  // …while every API gateway is fine, which is what this app may report.
  assertEquals(report.state, "ok");
});

Deno.test("service: a degraded API gateway is reported, with the component named", async () => {
  const { ctx } = mockCtx([{ body: withStatus("EU API", "degraded") }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["eu-api"]?.state, "degraded");
  assert(/EU API/.test(report.message ?? ""), report.message);
});

Deno.test("service: the worst API gateway sets the verdict", async () => {
  const { ctx } = mockCtx([{ body: withStatus("US API", "downtime") }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: an operator override wins over the measured status", async () => {
  const { ctx } = mockCtx([{ body: withStatus("AU API", "operational", "downtime") }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/** A broken status API says nothing about Relevance AI — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "text/html" },
    body: "<html>nope</html>",
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * The failure mode this guards is a page that still answers but no longer covers
 * the API — the tick that the API Gateways section was renamed must NOT be
 * swallowed by falling back to the page-wide aggregate.
 */
Deno.test("service: a page with no `* API` components reports unknown", async () => {
  const page = statusPage({ included: [statusResource("1", "Chat")] });
  const { ctx } = mockCtx([{ body: page }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no `\* API` components/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page that stops self-identifying as Relevance AI's reports unknown", async () => {
  const page = statusPage();
  (page.data as { attributes: Record<string, unknown> }).attributes = {
    company_name: "Somebody Else",
    custom_domain: "status.other.com",
  };
  const { ctx } = mockCtx([{ body: page }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: Better Stack's vocabulary maps to the four health states", () => {
  assertEquals(STATE.operational, "ok");
  assertEquals(STATE.degraded, "degraded");
  assertEquals(STATE.maintenance, "degraded");
  assertEquals(STATE.downtime, "down");
  // Anything unrecognised becomes `unknown` rather than optimistically healthy.
  assertEquals(STATE["something-new"], undefined);
});

Deno.test("service: component keys are slugs of the vendor's own names", () => {
  assertEquals(slug("AU API"), "au-api");
  assertEquals(slug("U.S. API "), "u-s-api");
});
