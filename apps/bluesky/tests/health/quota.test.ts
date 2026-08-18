import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const display = { service: "https://bsky.social" };
const withHeaders = (remaining: number, limit = 3000) => ({
  status: 200,
  body: { did: "did:web:bsky.social" },
  headers: {
    "content-type": "application/json",
    "ratelimit-limit": String(limit),
    "ratelimit-remaining": String(remaining),
    "ratelimit-reset": String(Math.floor(Date.now() / 1000) + 120),
    "ratelimit-policy": `${limit};w=300`,
  },
});

/** Bluesky publishes real headers, so this is a live probe. */
Deno.test("quota: reads the headers off a harmless unauthenticated call", async () => {
  const { ctx, calls } = mockCtx([withHeaders(2999)], { display });
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.server.describeServer");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
  assert(/2999 of 3000/.test(result.message!), result.message);
  assert(/3000;w=300/.test(result.message!), result.message);
});

Deno.test("quota: running low is degraded, exhausted is down", async () => {
  const low = mockCtx([withHeaders(120)], { display });
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const gone = mockCtx([withHeaders(0)], { display });
  const result = await quota.check!({}, gone.ctx);
  assertEquals(result.state, "down");
  assert(/refused until the reset/.test(result.message!), result.message);
});

/** A self-hosted PDS need not publish them. */
Deno.test("quota: a server without the headers is unknown, not broken", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { did: "did:web:pds" } }], { display });
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/self-hosted servers need not/.test(result.message!), result.message);
});

Deno.test("quota: an unreachable server is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: { display } as never,
  } as unknown as Parameters<NonNullable<typeof quota.check>>[1];
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

/** The service field has a default, so the failure case is a stored value that will not parse. */
Deno.test("quota: an unparseable stored server is unknown, not down", async () => {
  const { ctx, calls } = mockCtx([], { display: { service: "not a url" } });
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/**
 * The limit that actually strands a connection — roughly ten sign-ins a day —
 * is deliberately NOT probed, because a failed probe still consumes it and an
 * hourly check would cause the outage it was watching for.
 */
Deno.test("quota: never touches createSession, which probing would consume", async () => {
  const { ctx, calls } = mockCtx([withHeaders(2999)], { display });
  await quota.check!({}, ctx);
  for (const call of calls) {
    assert(!call.url.includes("createSession"), call.url);
  }
});

Deno.test("quota: the description says why the tighter limit is documented, not measured", () => {
  assert(/probing it\s+would consume it/.test(quota.description!), quota.description);
  assertEquals(quota.credential, "context");
});
