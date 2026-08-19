import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";
import quota from "../../health/quota.ts";

const summary = (
  components: Array<{ name: string; status: string }>,
  incidents: unknown[] = [],
) => ({
  status: 200,
  body: {
    status: { description: "All Systems Operational", indicator: "none" },
    components,
    incidents,
  },
});

const operational = [
  { name: "API (api.tailscale.com)", status: "operational" },
  { name: "Coordination service", status: "operational" },
  { name: "DERP relay servers", status: "operational" },
];

const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

Deno.test("service: an operational API is ok", async () => {
  const { ctx, calls } = mockCtx([summary(operational)]);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://status.tailscale.com/api/v2/summary.json");
  assertEquals(result.state, "ok");
});

Deno.test("service: a major outage of the API is down", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API (api.tailscale.com)", status: "major_outage" },
    ...operational.slice(1),
  ], [{ name: "API unavailable" }])]);
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/API unavailable/.test(result.message!), result.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API (api.tailscale.com)", status: "degraded_performance" },
    ...operational.slice(1),
  ])]);
  assertEquals((await run(ctx)).state, "degraded");
});

/**
 * The distinction this check exists for: the data plane is peer-to-peer, so a
 * coordination outage is not this app failing.
 */
Deno.test("service: a coordination outage is degraded and named as the network's, not ours", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API (api.tailscale.com)", status: "operational" },
    { name: "Coordination service", status: "major_outage" },
    { name: "DERP relay servers", status: "operational" },
  ])]);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/Coordination service is major_outage/.test(result.message!), result.message);
  assert(/rather than these actions/.test(result.message!), result.message);
  assert(/peer-to-peer connections keep working/.test(result.message!), result.message);
});

/** A DERP outage takes out some connections and leaves most of the tailnet fine. */
Deno.test("service: a DERP outage is reported alongside a healthy API", async () => {
  const { ctx } = mockCtx([summary([
    { name: "API (api.tailscale.com)", status: "operational" },
    { name: "Coordination service", status: "operational" },
    { name: "DERP relay servers", status: "partial_outage" },
  ])]);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/DERP relay servers is partial_outage/.test(result.message!), result.message);
});

/** Statuspage component names are editable, so a rename is a check to fix. */
Deno.test("service: a renamed API component is unknown rather than an outage", async () => {
  const { ctx } = mockCtx([summary([{ name: "Tailscale API", status: "operational" }])]);
  const result = await run(ctx);
  assertEquals(result.state, "unknown");
  assert(/probably been renamed/.test(result.message!), result.message);
});

Deno.test("service: an unreachable or non-JSON status page is unknown", async () => {
  const down = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await run(down.ctx)).state, "unknown");
  const html = mockCtx([{ status: 200, body: "<html>" }]);
  assertEquals((await run(html.ctx)).state, "unknown");
});

Deno.test("service: is app-scoped, unauthenticated and fatal", () => {
  assertEquals(check.scope, "app");
  assertEquals(check.credential, "none");
  assertEquals(check.severity, "fatal");
  assertEquals(check.network!.allow, ["status.tailscale.com"]);
});

/** Measured: no rate-limit header of any kind. */
Deno.test("quota: is a declared absence naming what binds instead", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(/no rate-limit headers/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/over-billing-limit/.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
