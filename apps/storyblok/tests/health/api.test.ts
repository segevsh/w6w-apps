import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/api.ts";
import service from "../../health/service.ts";

const D = { display: { credentialKind: "delivery", region: "eu" } };
const M = { display: { credentialKind: "management", region: "us", spaceId: "123" } };
const run = (ctx: Parameters<NonNullable<typeof check.check>>[1]) => check.check!({}, ctx);

/** Probing the wrong API would report an outage this connection never sees. */
Deno.test("api: a delivery connection is probed against the CDN", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { space: { name: "Marketing site", version: 1735645795 } },
  }], D);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://api.storyblok.com/v2/cdn/spaces/me");
  assertEquals(result.state, "ok");
  assert(/Marketing site/.test(result.message!), result.message);
  assert(/cache version 1735645795/.test(result.message!), result.message);
});

Deno.test("api: a management connection is probed against its space, in its region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { space: { name: "Marketing" } } }], M);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://api-us.storyblok.com/v1/spaces/123");
  assertEquals(result.state, "ok");
  assert(!/cache version/.test(result.message!), "only delivery carries a cv");
});

/** The failure people miss: the space is in another region. */
Deno.test("api: a 401 names the region as well as the credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }], D);
  const result = await run(ctx);
  assertEquals(result.state, "down");
  assert(/set to the eu region/.test(result.message!), result.message);
  assert(/identical to a revoked token/.test(result.message!), result.message);
});

Deno.test("api: a 429 is degraded and quotes the limits", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: "Too many requests" } }], D);
  const result = await run(ctx);
  assertEquals(result.state, "degraded");
  assert(/pages of 25/.test(result.message!), result.message);
});

Deno.test("api: a 5xx is down and a 4xx is degraded", async () => {
  const server = mockCtx([{ status: 502, body: "" }], D);
  assertEquals((await run(server.ctx)).state, "down");
  const client = mockCtx([{ status: 404, body: {} }], D);
  assertEquals((await run(client.ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: D,
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  assertEquals((await run(ctx)).state, "down");
});

/** A management connection with no space has nothing to probe. */
Deno.test("api: a management connection without a space id is unknown", async () => {
  const { ctx, calls } = mockCtx([], { display: { credentialKind: "management", region: "eu" } });
  const result = await run(ctx);
  assertEquals(result.state, "unknown");
  assertEquals(calls.length, 0);
});

/** Measured: the status page publishes no feed. */
Deno.test("service: is a declared absence explaining both halves of the reason", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  assert(/uptime\.storyblok\.com/.test(service.unavailable!.reason), service.unavailable!.reason);
  assert(/fail separately/.test(service.unavailable!.reason), service.unavailable!.reason);
});
