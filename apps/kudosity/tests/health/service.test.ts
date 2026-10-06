import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const check = service.check as any;

Deno.test("service: an unsigned 401 with the gateway's status body is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { status: "Invalid api key" } }]);
  assertEquals((await check({}, ctx)).state, "ok");
  assertEquals(calls[0].url, `${API_ROOT}/webhook`);
  assertEquals("x-api-key" in calls[0].headers, false);
});

Deno.test("service: 5xx is down; a 200 or an unrecognised body is unknown", async () => {
  assertEquals((await check({}, mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  assertEquals((await check({}, mockCtx([{ status: 200, body: {} }]).ctx)).state, "unknown");
  assertEquals((await check({}, mockCtx([{ status: 401, body: "<html>" }]).ctx)).state, "unknown");
});

Deno.test("service: a network failure is down", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  // deno-lint-ignore no-explicit-any
  assertEquals((await check({}, ctx as any)).state, "down");
});

Deno.test("quota: declared unavailable, informational, no check hook", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals("check" in quota, false);
});
