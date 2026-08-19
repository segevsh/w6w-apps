import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import credential from "../../health/credential.ts";

Deno.test("credential: reads the organisation list with this connection's token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: "org-1" }] } }]);
  const result = await credential.check!({}, ctx);
  assertEquals(calls[0].url, "https://cloud.mongodb.com/api/atlas/v2/orgs");
  assertEquals(calls[0].headers["accept"].startsWith("application/vnd.atlas."), true);
  assertEquals(result.state, "ok");
  assert(/reaches 1 organisation/.test(result.message!), result.message);
});

/** A token lasting an hour fails as often from a missed refresh as a revocation. */
Deno.test("credential: a 401 names the refresh as a likely cause", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await credential.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/refresh that did not happen/.test(result.message!), result.message);
});

/**
 * The silent failure state: perfect credential, no role, every action returns
 * a 403 or an empty list and nothing says why.
 */
Deno.test("credential: a working token that sees nothing is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await credential.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/never granted a role/.test(result.message!), result.message);
  assert(/403 or an empty result/.test(result.message!), result.message);
});

Deno.test("credential: a 5xx is down and another 4xx is degraded", async () => {
  const server = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await credential.check!({}, server.ctx)).state, "down");

  const forbidden = mockCtx([{ status: 403, body: { detail: "no" } }]);
  const result = await credential.check!({}, forbidden.ctx);
  assertEquals(result.state, "degraded");
  assert(/per PROJECT/.test(result.message!), result.message);
});

Deno.test("credential: an unreachable or non-JSON Atlas is unknown", async () => {
  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof credential.check>>[1];
  assertEquals((await credential.check!({}, offline)).state, "unknown");

  const html = mockCtx([{ status: 200, body: "<html/>" }]);
  assertEquals((await credential.check!({}, html.ctx)).state, "unknown");
});

Deno.test("credential: it is signed, connection-scoped, and reports latency", async () => {
  assertEquals(credential.credential, "signed");
  assertEquals(credential.scope, "connection");
  assertEquals(credential.kind, "credential");
  const { ctx } = mockCtx([{ status: 200, body: { results: [{ id: "a" }] } }]);
  const result = await credential.check!({}, ctx);
  assertEquals(typeof result.latencyMs, "number");
});
