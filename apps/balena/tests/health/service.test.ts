import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";

const summary = (
  components: Array<{ name: string; status: string }>,
  incidents: unknown[] = [],
) => ({
  status: 200,
  body: {
    status: { description: "All Systems Operational" },
    components,
    incidents,
  },
});

const healthy = [
  { name: "API", status: "operational" },
  { name: "Cloudlink (VPN)", status: "operational" },
  { name: "Application Builder", status: "operational" },
  { name: "Application Registry", status: "operational" },
  { name: "Delta Image Downloads", status: "operational" },
  { name: "AWS ec2-us-east-1", status: "operational" },
];

const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

Deno.test("service: an operational API and VPN is ok", async () => {
  const { ctx, calls } = mockCtx([summary(healthy)]);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://status.balena.io/api/v2/summary.json");
  assertEquals(result.state, "ok");
});

Deno.test("service: an API outage is down", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API", status: "major_outage" },
    ...healthy.slice(1),
  ], [{ name: "API unavailable" }])]);
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/API unavailable/.test(result.message!), result.message);
});

/**
 * The split this check exists for: the four supervisor actions travel over
 * Cloudlink and fail independently of everything else.
 */
Deno.test("service: a Cloudlink outage names the actions it breaks, and only those", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API", status: "operational" },
    { name: "Cloudlink (VPN)", status: "major_outage" },
    ...healthy.slice(2),
  ])]);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/device-reboot/.test(result.message!), result.message);
  assert(/device-purge-data/.test(result.message!), result.message);
  assert(/every read and configuration change keeps working/.test(result.message!), result.message);
});

/** A deployment that never arrives is not an outage. */
Deno.test("service: a builder problem is reported as the release pipeline", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API", status: "operational" },
    { name: "Cloudlink (VPN)", status: "operational" },
    { name: "Application Builder", status: "partial_outage" },
    { name: "Application Registry", status: "operational" },
    { name: "Delta Image Downloads", status: "operational" },
  ])]);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/a deployment may never arrive/.test(result.message!), result.message);
});

/** balena publishes AWS components; a regional AWS notice is not balena down. */
Deno.test("service: an AWS component going red does not change the verdict", async () => {
  const { ctx } = mockCtx([summary([
    ...healthy.slice(0, 5),
    { name: "AWS ec2-us-east-1", status: "major_outage" },
  ])]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("service: a renamed API component is unknown rather than an outage", async () => {
  const { ctx } = mockCtx([summary([{ name: "balena API", status: "operational" }])]);
  const result = await run(ctx);
  assertEquals(result.state, "unknown");
  assert(/probably been renamed/.test(result.message!), result.message);
});

/** /ping answers two bytes of text; parsing it as JSON fails on a healthy API. */
Deno.test("api: an OK from /ping is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "OK" }]);
  const result = await api.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.balena-cloud.com/ping");
  assertEquals(calls[0].headers["authorization"], undefined, "it must need no credential");
  assertEquals(result.state, "ok");
});

Deno.test("api: something other than OK is a proxy, not the API", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>Sign in</html>" }]);
  const result = await api.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or captive portal/.test(result.message!), result.message);
});

Deno.test("api: a 5xx is down, a 4xx is degraded, an unreachable host is down", async () => {
  const server = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, server.ctx)).state, "down");
  const client = mockCtx([{ status: 403, body: "" }]);
  assertEquals((await api.check!({}, client.ctx)).state, "degraded");

  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof api.check>>[1];
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: is unauthenticated and app-scoped", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.network!.allow, ["api.balena-cloud.com"]);
});

/** Measured: no rate-limit header at all. */
Deno.test("quota: is a declared absence naming what binds instead", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(/no rate-limit headers/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/device count/.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
