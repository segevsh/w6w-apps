import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import tenant from "../../health/tenant.ts";

const conn = { display: { domain: "acme.us.auth0.com", tenant: "acme" } };

/**
 * Auth0's only machine-readable status source is a per-tenant RSS feed, whose
 * URL cannot be a static `feed.url`.
 */
Deno.test("service: is a declared absence carrying the evidence", () => {
  assert(service.unavailable, "service should be declared unavailable");
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(/status\.auth0\.com/.test(reason), reason);
  assert(/api\/rss\?domain=/.test(reason), reason);
  assert(/static `feed.url`/.test(reason), reason);
});

Deno.test("tenant: a readable tenant reports ok and its user count", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users: [], total: 4210 } }], conn);
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "ok");
  assert(out.message!.includes("4210"), out.message);
  assertEquals(out.quota![0].remaining, 4210);
  assertEquals(new URL(calls[0].url).host, "acme.us.auth0.com");
});

/** A missing scope breaks the user actions and nothing else. */
Deno.test("tenant: a missing read:users grant is degraded, not down", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }], conn);
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert(/read:users/.test(out.message!), out.message);
});

Deno.test("tenant: a renamed or missing tenant is down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  assertEquals((await tenant.check!({}, ctx)).state, "down");
});

/** Credential failures belong to the derived auth check. */
Deno.test("tenant: a 401 is unknown, and names the likely cause", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], conn);
  const out = await tenant.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(/refresh/.test(out.message!), out.message);
});

Deno.test("tenant: rate limiting is degraded", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }], conn);
  assertEquals((await tenant.check!({}, ctx)).state, "degraded");
});

Deno.test("tenant: a connection with no domain is down immediately", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await tenant.check!({}, ctx)).state, "down");
  assertEquals(calls.length, 0);
});

Deno.test("tenant: is a connection-scoped signed dependency check", () => {
  assertEquals(tenant.kind, "dependency");
  assertEquals(tenant.scope, "connection");
  assertEquals(tenant.credential, "signed");
});
