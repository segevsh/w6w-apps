import { assertEquals } from "@std/assert";
import { mockCtx, mockNocrmCtx } from "../_helpers.ts";
import subdomain from "../../health/subdomain.ts";

Deno.test("subdomain: is an unsigned, connection-scoped dependency check", () => {
  assertEquals(subdomain.kind, "dependency");
  assertEquals(subdomain.scope, "connection");
  assertEquals(subdomain.credential, "context");
  // `*.nocrm.io` is already the app's allowlist, and a `context` check is
  // unsigned regardless — so it declares no network of its own.
  assertEquals(subdomain.network, undefined);
});

Deno.test("subdomain: unknown when the connection records no subdomain", async () => {
  const { ctx, calls } = mockCtx();
  const r = await subdomain.check!({}, ctx);
  assertEquals(r.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("subdomain: an unsigned probe passes when the vendor asks for a credential", async () => {
  // Measured live 2026-09-22 against a real account: no key at all answers
  // `unauthorized_missing_token` — the account is there.
  const { ctx, calls } = mockNocrmCtx([{
    status: 401,
    body: {
      error: 401,
      message: "Unauthorized: missing api_key or user token",
      type: "unauthorized_missing_token",
    },
  }]);
  const r = await subdomain.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/ping");
  // Signed by nothing: a credential would turn the answer into an
  // `invalid_token` and make every healthy account look missing.
  assertEquals("x-api-key" in calls[0].headers, false);
  assertEquals("x-user-token" in calls[0].headers, false);
});

Deno.test("subdomain: invalid_token means no account answers for that subdomain", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 401,
    body: {
      error: 401,
      message: "Unauthorized: invalid api_key",
      type: "unauthorized_invalid_token",
    },
  }]);
  const r = await subdomain.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("no noCRM account answers"), true);
});

Deno.test("subdomain: a suspended account is degraded, with the vendor's own message", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 402,
    body: {
      error: 402,
      message: "Suspended account: pay your subscription to use the API.",
      type: "suspended_account",
    },
  }]);
  const r = await subdomain.check!({}, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "Suspended account: pay your subscription to use the API.");
});

Deno.test("subdomain: a non-API answer at the host is down", async () => {
  // A sibling host serving a different product answers a plain HTTP 404.
  const { ctx } = mockNocrmCtx([{ status: 404, body: "<!DOCTYPE html><html>" }]);
  assertEquals((await subdomain.check!({}, ctx)).state, "down");
});

Deno.test("subdomain: a 5xx is down", async () => {
  const { ctx } = mockNocrmCtx([{ status: 502, body: "" }]);
  assertEquals((await subdomain.check!({}, ctx)).state, "down");
});

Deno.test("subdomain: an unreachable origin is down, not unknown", async () => {
  // An empty queue makes the mock's fetch throw — DNS/TLS/transport failure.
  const { ctx } = mockNocrmCtx([]);
  const r = await subdomain.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("could not reach"), true);
});
