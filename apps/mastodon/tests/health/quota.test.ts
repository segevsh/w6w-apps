import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const display = { url: "https://mastodon.social" };
const withHeaders = (remaining: number, limit = 300) => ({
  status: 200,
  body: { domain: "mastodon.social" },
  headers: {
    "content-type": "application/json",
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
    // An ISO timestamp, not epoch seconds — which is the trap.
    "x-ratelimit-reset": new Date(Date.now() + 120_000).toISOString(),
  },
});

Deno.test("quota: reads the headers off an unauthenticated call", async () => {
  const { ctx, calls } = mockCtx([withHeaders(298)], { display });
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://mastodon.social/api/v2/instance");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
  assert(/298 of 300/.test(result.message!), result.message);
});

/** The reset is an ISO timestamp; parsing it as a number would give NaN. */
Deno.test("quota: the ISO reset is turned into seconds from now", async () => {
  const { ctx } = mockCtx([withHeaders(298)], { display });
  const result = await quota.check!({}, ctx);
  assert(/resets in 1[12]\d?s/.test(result.message!), result.message);
  assert(!/NaN/.test(result.message!), result.message);
});

Deno.test("quota: an unparseable reset does not break the report", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": "10",
      "x-ratelimit-reset": "not a date",
    },
  }], { display });
  const result = await quota.check!({}, ctx);
  assert(!/NaN/.test(result.message!), result.message);
  assert(!/resets in/.test(result.message!), result.message);
});

Deno.test("quota: running low is degraded, exhausted is down", async () => {
  const low = mockCtx([withHeaders(20)], { display });
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const gone = mockCtx([withHeaders(0)], { display });
  const result = await quota.check!({}, gone.ctx);
  assertEquals(result.state, "down");
  assert(/refused until the reset/.test(result.message!), result.message);
});

/** Some instances do not publish them, and a proxy can strip them. */
Deno.test("quota: an instance without the headers is unknown, not broken", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], { display });
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/a proxy\s+in front can strip them/.test(result.message!), result.message);
});

Deno.test("quota: an unreachable instance is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: { display } as never,
  } as unknown as Parameters<NonNullable<typeof quota.check>>[1];
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

/** Small servers set far lower limits than mastodon.social. */
Deno.test("quota: says the limit belongs to the instance", () => {
  assert(/a fraction of what mastodon.social does/.test(quota.description!), quota.description);
  assertEquals(quota.credential, "context");
});
