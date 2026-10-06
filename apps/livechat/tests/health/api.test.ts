import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf, unauthorized } from "../_helpers.ts";

Deno.test("api: is an unsigned dependency probe on the app's own host", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  assertEquals(typeof api.severity, "string");
});

Deno.test("api: the documented authentication envelope is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: unauthorized }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/list_channels");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { error: { type: "service_unavailable" } } }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: other error types are degraded, service_unavailable on a 4xx is down", async () => {
  const a = mockCtx([{
    status: 400,
    body: { error: { type: "misdirected_request", message: "x" } },
  }]);
  assertEquals((await api.check!({}, a.ctx)).state, "degraded");
  const b = mockCtx([{
    status: 429,
    body: { error: { type: "service_unavailable", message: "x" } },
  }]);
  assertEquals((await api.check!({}, b.ctx)).state, "down");
});

Deno.test("api: a 200 that is not an error envelope is not a pass (SPA shell / wrong host)", async () => {
  const html = mockCtx([{ status: 200, body: "<html>marketing</html>" }]);
  const out = await api.check!({}, html.ctx);
  assertEquals(out.state, "degraded");
  const arr = mockCtx([{ status: 200, body: [] }]);
  assertEquals((await api.check!({}, arr.ctx)).state, "degraded");
});

Deno.test("api: a non-envelope 4xx is unknown, and a network failure is down", async () => {
  const odd = mockCtx([{ status: 404, body: "<html>nope</html>" }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  const out = await api.check!({}, ctx as never);
  assertEquals(out.state, "down");
  assert(out.message!.includes("dns"));
});

Deno.test("quota: declared unavailable at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 20);
  assertEquals(quota.check, undefined);
});
