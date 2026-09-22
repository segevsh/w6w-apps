import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";

const check = (status: number, body?: unknown) => api.check!({}, mockCtx([{ status, body }]).ctx);

Deno.test("health/api: a 200 is up", async () => {
  const report = await check(200);
  assertEquals(report.state, "ok");
  assert(/accepted this connection's key/.test(report.message!), report.message);
});

/**
 * The decisive case: HeyReach answers BOTH auth failures with 401, and a
 * schema-correct auth answer is proof the API is serving. The credential verdict
 * belongs to the derived auth:api-key check, which the message names.
 */
Deno.test("health/api: `Invalid API key` is reachable, not an outage", async () => {
  const report = await check(401, "Invalid API key");
  assertEquals(report.state, "ok");
  assert(/vendor is reachable/.test(report.message!), report.message);
  assert(/auth:api-key/.test(report.message!), report.message);
});

Deno.test("health/api: `Missing API key` is reachable too", async () => {
  const report = await check(401, "Missing API key");
  assertEquals(report.state, "ok");
  assert(/reconnect the connection/.test(report.message!), report.message);
});

Deno.test("health/api: a 401 without an auth body is not classifiable", async () => {
  const report = await check(401, "something else");
  assertEquals(report.state, "unknown");
});

Deno.test("health/api: a 5xx is down", async () => {
  assertEquals((await check(503, "boom")).state, "down");
});

Deno.test("health/api: a 429 is degraded, not down", async () => {
  const report = await check(429, "");
  assertEquals(report.state, "degraded");
  assert(/rate-limited/.test(report.message!), report.message);
});

Deno.test("health/api: a 404 on the documented path is degraded, not down", async () => {
  const report = await check(404, "<html>not found</html>");
  assertEquals(report.state, "degraded");
  assert(/path prefix/.test(report.message!), report.message);
});

Deno.test("health/api: an HTML 200 is not mistaken for the API", async () => {
  // A 200 is the documented answer, so this is `ok`; the point is that the
  // reachability check never parses a body it cannot classify as JSON.
  assertEquals((await check(200, "<html>shell</html>")).state, "ok");
});

Deno.test("health/api: an unreachable host is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof api.check>>[1];
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/could not reach/.test(report.message!), report.message);
});

/** The probe is signed by the auth hook; the check itself must not set a key. */
Deno.test("health/api: the check is connection-scoped, signed, and names no extra host", () => {
  assertEquals(api.kind, "service");
  assertEquals(api.scope, "connection");
  assertEquals(api.credential, "signed");
  assertEquals(api.network, undefined);
  assertEquals(api.unavailable, undefined);
  assertEquals(api.covers, ["*"]);
});
