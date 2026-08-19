import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/instance.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

const D = { display: { host: "https://nocodb.internal" } };
const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

/** Unauthenticated, so a revoked token cannot present as an outage. */
Deno.test("instance: probes /api/v1/health and carries no credential", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { message: "OK", uptime: 63296.5 },
  }], D);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://nocodb.internal/api/v1/health");
  assertEquals(calls[0].headers["xc-token"], undefined);
  assertEquals(check.credential, "none");
  assertEquals(result.state, "ok");
  assert(/up 18h/.test(result.message!), result.message);
});

/**
 * The pattern this exists for: every individual check passes while the
 * container restarts.
 */
Deno.test("instance: a short uptime is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "OK", uptime: 42 } }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/42 seconds/.test(result.message!), result.message);
  assert(/the process is restarting/.test(result.message!), result.message);
});

Deno.test("instance: a healthy long-running instance is plainly ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "OK", uptime: 400 } }], D);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("instance: anything but OK is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "DEGRADED" } }], D);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("instance: a non-JSON body reads as a proxy rather than an outage", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>Sign in</html>" }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or a login page/.test(result.message!), result.message);
});

Deno.test("instance: unreachable is down, and no recorded host is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: D,
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  assertEquals((await run(ctx)).state, "down");

  const noHost = mockCtx([], { display: {} });
  assertEquals((await run(noHost.ctx)).state, "unknown");
  assertEquals(noHost.calls.length, 0);
});

/** The budget is small enough that reading it is worth one of it. */
Deno.test("quota: reports the remaining count NocoDB publishes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list: [] },
    headers: {
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "50",
      "x-ratelimit-reset": "60",
    },
  }], D);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://nocodb.internal/api/v2/meta/bases");
  assertEquals(result.state, "ok");
  assert(/50 of 60 requests left/.test(result.message!), result.message);
});

Deno.test("quota: a nearly-spent budget is degraded", async () => {
  const low = mockCtx([{
    status: 200,
    body: { list: [] },
    headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "4" },
  }], D);
  const result = await quota.check!({}, low.ctx);
  assertEquals(result.state, "degraded");
  assert(/gets a 429/.test(result.message!), result.message);

  const watch = mockCtx([{
    status: 200,
    body: { list: [] },
    headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "12" },
  }], D);
  assertEquals((await quota.check!({}, watch.ctx)).state, "degraded");
});

Deno.test("quota: a 429 says when the window refills", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { message: "Too many requests" },
    headers: { "x-ratelimit-reset": "37" },
  }], D);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/refills in 37 seconds/.test(result.message!), result.message);
});

/** A proxy that strips the headers leaves nothing to read. */
Deno.test("quota: missing headers are unknown rather than a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { list: [] } }], D);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/behind a proxy that strips them/.test(result.message!), result.message);
});

/** Measured: no feed, and it would speak only for the cloud. */
Deno.test("service: is a declared absence with both halves of the reason", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(/return 404/.test(service.unavailable!.reason), service.unavailable!.reason);
  assert(/self-hosted more often than not/.test(service.unavailable!.reason));
});
