import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import surface from "../../health/surface.ts";
import { EVENTS_HOSTS } from "../../lib/client.ts";

const connect = (vaultCount?: number) => ({
  surface: "connect",
  url: "https://op.example.com",
  vaultCount,
});
const events = (features?: string[]) => ({ surface: "events", region: "eu", features });

Deno.test("surface: a Connect connection probes the Connect server", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "v1" }] }], {
    display: connect(1),
  });
  const result = await surface.check!({}, ctx);
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults");
  assertEquals(result.state, "ok");
  assert(/1 vault\b/.test(result.message!), result.message);
});

Deno.test("surface: an Events connection probes introspection instead", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Features: ["auditevents"] } }], {
    display: events(["auditevents"]),
  });
  const result = await surface.check!({}, ctx);
  assertEquals(calls[0].url, `${EVENTS_HOSTS.eu}/api/auth/introspect`);
  assertEquals(result.state, "ok");
  assert(/granted: auditevents/.test(result.message!), result.message);
});

/**
 * A vault deleted from the token's scope keeps the token working and starts
 * producing 404s that look like wrong ids.
 */
Deno.test("surface: a Connect scope that shrank is degraded, and says what it looks like", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "v1" }] }], { display: connect(3) });
  const result = await surface.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/reached 3 vaults .* and reaches 1 now/.test(result.message!), result.message);
  assert(/looks like a wrong id/.test(result.message!), result.message);
});

/** Likewise a narrowed Events grant keeps working on the endpoints it kept. */
Deno.test("surface: lost Events grants are degraded, and named", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { Features: ["auditevents"] } }], {
    display: events(["auditevents", "itemusages"]),
  });
  const result = await surface.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/lost grants/.test(result.message!), result.message);
  assert(/itemusages/.test(result.message!), result.message);
});

/** A credential that reaches nothing is not a working connection. */
Deno.test("surface: an empty scope is down on either surface", async () => {
  const noVaults = mockCtx([{ status: 200, body: [] }], { display: connect(2) });
  const vaultResult = await surface.check!({}, noVaults.ctx);
  assertEquals(vaultResult.state, "down");
  assert(/every item action will 404/.test(vaultResult.message!), vaultResult.message);

  const noGrants = mockCtx([{ status: 200, body: { Features: [] } }], { display: events([]) });
  const grantResult = await surface.check!({}, noGrants.ctx);
  assertEquals(grantResult.state, "down");
  assert(/every action will 403/.test(grantResult.message!), grantResult.message);
});

/** A rejected token is the derived auth check's business, not an outage. */
Deno.test("surface: a rejected credential is unknown, not down", async () => {
  for (const status of [401, 403]) {
    const connectCtx = mockCtx([{ status, body: {} }], { display: connect() });
    assertEquals((await surface.check!({}, connectCtx.ctx)).state, "unknown");

    const eventsCtx = mockCtx([{ status, body: {} }], { display: events() });
    assertEquals((await surface.check!({}, eventsCtx.ctx)).state, "unknown");
  }
});

/** Connect is on your own infrastructure, so unreachability is not 1Password's. */
Deno.test("surface: an unreachable Connect server says whose problem it is", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("ECONNREFUSED")),
    log: () => {},
    connection: { display: connect() } as never,
  } as unknown as Parameters<NonNullable<typeof surface.check>>[1];
  const result = await surface.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/your own\s+infrastructure/.test(result.message!), result.message);
});

Deno.test("surface: a non-JSON Connect body is degraded and named as a proxy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }], { display: connect() });
  const result = await surface.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/proxy or another service/.test(result.message!), result.message);
});

Deno.test("surface: a connection with no Connect URL is unknown", async () => {
  const { ctx, calls } = mockCtx([], { display: { surface: "connect" } });
  assertEquals((await surface.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("surface: is signed and per-connection", () => {
  assertEquals(surface.credential, "signed");
  assertEquals(surface.scope, "connection");
  assertEquals(surface.kind, "credential");
});
