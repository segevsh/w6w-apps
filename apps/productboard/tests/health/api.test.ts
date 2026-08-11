import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import api, { REACHABILITY_URL } from "../../health/api.ts";
import { errorBody, gatewayError, mockCtx } from "../_helpers.ts";

Deno.test("health/api: the probe is a GET, never a HEAD", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: gatewayError("Unauthorized") }]);
  await api.check!({}, ctx);
  // Measured 2026-08-11: HEAD on a live v2 path answers 404 route.notFound while
  // GET answers 401. A HEAD probe would report a healthy API as a dead route.
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, REACHABILITY_URL);
  assertEquals(REACHABILITY_URL, "https://api.productboard.com/v2/entities/configurations");
});

Deno.test("health/api: the probe is unsigned and carries no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: gatewayError("Unauthorized") }]);
  await api.check!({}, ctx);
  assertEquals(api.credential, "none");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.network, undefined, "the probe stays on the app's own allowlisted host");
});

Deno.test("health/api: an unsigned 401 is a PASS — it proves the route is alive", async () => {
  const { ctx } = mockCtx([{ status: 401, body: gatewayError("Unauthorized") }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "ok");
  assert(out.message!.includes("correctly refused"), out.message);
});

Deno.test("health/api: a route.notFound is down and says the path moved", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("route.notFound", "Route not found", "No such path."),
  }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("v2 API moved"), out.message);
});

Deno.test("health/api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: gatewayError("upstream") }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("health/api: a 200 with no credential is degraded — the auth probe would be a no-op", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message!.includes("no longer detect a missing token"), out.message);
});

Deno.test("health/api: an unexpected 4xx is unknown rather than a guess", async () => {
  const { ctx } = mockCtx([{ status: 418, body: gatewayError("teapot") }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

Deno.test("health/api: a transport failure is down with the reason", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns failure")),
    log: () => {},
  } as unknown as HookContext;
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("dns failure"), out.message);
});

Deno.test("health/api: a 404 that is NOT route.notFound is still down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: gatewayError("no Route matched") }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});
