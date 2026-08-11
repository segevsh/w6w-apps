import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { AUTH_HEADER } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("health/api: is unsigned and connection-scoped", () => {
  assertEquals(api.credential, "context");
  assertEquals(api.scope, "connection");
  assertEquals(api.kind, "dependency");
  // A `context` check may not widen egress and does not need to: the API host is
  // already the app's only allowlist entry.
  assertEquals(api.network, undefined);
});

Deno.test("health/api: a 401 PASSES — it proves the route resolved", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: "X-Auth-Token header is required" }]);
  const report = await api.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/time");
  // Unsigned: the probe must not carry a credential.
  assertEquals(calls[0].headers[AUTH_HEADER], undefined);
});

Deno.test("health/api: a 404 means BigCommerce stopped serving the route", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "The route is not found, check the URL" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("no longer serves"), report.message);
});

Deno.test("health/api: 503 is a down store, 429 is a busy one, 5xx is down", async () => {
  const cases: Array<[number, string]> = [[503, "down"], [429, "degraded"], [500, "down"]];
  for (const [status, expected] of cases) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    assertEquals((await api.check!({}, ctx)).state, expected, `status ${status}`);
  }
});

Deno.test("health/api: an unexpected status is `unknown`, not a guess", async () => {
  const { ctx } = mockCtx([{ status: 418, body: "" }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});

Deno.test("health/api: without a store hash it reports unknown and makes no request", async () => {
  // `mockCtx([])` throws on any fetch, so a request here fails the test.
  const { ctx } = mockCtx([], { storeHash: null });
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no store hash"), report.message);
});
