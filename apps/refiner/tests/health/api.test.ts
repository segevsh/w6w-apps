import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const check = (status: number, body?: unknown) => api.check!({}, mockCtx([{ status, body }]).ctx);

Deno.test("health/api: the documented success shape is ok", async () => {
  const r = await check(200, { project_uuid: "p1", project_name: "P", message: "ok" });
  assertEquals(r.state, "ok");
  assert(/accepted this connection's key/.test(r.message!), r.message);
});

Deno.test("health/api: each schema-correct key refusal proves reachability (ok, not down)", async () => {
  const refusals: Array<[number, unknown, RegExp]> = [
    [401, { error: "No API key found in headers" }, /No API key found/],
    [401, { error: "API key does not look valid" }, /does not look valid/],
    [404, { message: "API key not valid or does not exist" }, /not valid or does not exist/],
  ];
  for (const [status, body, re] of refusals) {
    const r = await check(status, body);
    assertEquals(r.state, "ok");
    assert(re.test(r.message!), r.message);
    assert(/auth:api-key/.test(r.message!), r.message);
  }
});

Deno.test("health/api: a 404 with an unrecognised body is NOT a pass", async () => {
  assertEquals((await check(404, "Not found")).state, "unknown");
});

Deno.test("health/api: 429 is degraded, 5xx is down, an HTML 200 is degraded", async () => {
  assertEquals((await check(429, { error: "slow down" })).state, "degraded");
  assertEquals((await check(503, "maintenance")).state, "down");
  assertEquals((await check(200, "<html>shell</html>")).state, "degraded");
});

Deno.test("health/api: an unreachable host is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} } as never;
  const r = await api.check!({}, ctx);
  assertEquals(r.state, "down");
  assert(/could not reach/.test(r.message!), r.message);
});

Deno.test("health/api: connection-scoped, signed, no extra egress", () => {
  assertEquals(api.kind, "service");
  assertEquals(api.scope, "connection");
  assertEquals(api.credential, "signed");
  assertEquals(api.network, undefined);
  assertEquals(api.severity, "fatal");
});
