import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

const display = { url: "https://abc.ui.nabu.casa" };
const running = {
  status: 200,
  body: { state: "RUNNING", version: "2026.8.1", location_name: "Home" },
};

Deno.test("instance: reads the connection's own host", async () => {
  const { ctx, calls } = mockCtx([running], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/config");
  assertEquals(result.state, "ok");
  assert(/Home running 2026.8.1/.test(result.message!), result.message);
});

/**
 * After a restart the API answers for minutes while integrations load, during
 * which everything reads unavailable. That is waiting, not an outage.
 */
Deno.test("instance: STARTING is degraded, and says what it means", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { state: "STARTING" } }], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/still starting/.test(result.message!), result.message);
  assert(/unavailable/.test(result.message!), result.message);
});

Deno.test("instance: any other reported state is degraded too", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { state: "STOPPING" } }], { display });
  assertEquals((await instance.check!({}, ctx)).state, "degraded");
});

/** A revoked token is not an outage — the derived auth check owns it. */
Deno.test("instance: a rejected token is unknown, not down", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: { message: "Unauthorized" } }], { display });
    const result = await instance.check!({}, ctx);
    assertEquals(result.state, "unknown");
    assert(/token was rejected/.test(result.message!), result.message);
  }
});

Deno.test("instance: an unreachable or erroring host is down", async () => {
  const erroring = mockCtx([{ status: 502, body: "bad gateway" }], { display });
  assertEquals((await instance.check!({}, erroring.ctx)).state, "down");

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: { display } as never,
  } as unknown as Parameters<NonNullable<typeof instance.check>>[1];
  assertEquals((await instance.check!({}, offline)).state, "down");
});

/** The web UI answers 200 with HTML while the API is entirely dead. */
Deno.test("instance: an HTML body is degraded and named as a proxy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>Home Assistant</html>" }], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/reverse proxy or a login page/.test(result.message!), result.message);
});

Deno.test("instance: a connection with no URL is unknown", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await instance.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/** There is no unauthenticated endpoint worth probing on this API. */
Deno.test("instance: is signed, unlike most dependency checks here", () => {
  assertEquals(instance.credential, "signed");
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
});
