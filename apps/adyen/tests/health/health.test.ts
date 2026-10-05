import { assert, assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

type CheckArg = Parameters<NonNullable<typeof api.check>>[0];
const run = (ctx: HookContext) => api.check!({} as CheckArg, ctx);

Deno.test("health.api: probes an unauthenticated JSON POST on the test host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { status: 401, errorCode: "000", errorType: "security", message: "Unauthorized" },
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(!("x-api-key" in calls[0].headers) && !("authorization" in calls[0].headers));
});

Deno.test("health.api: a 5xx is down even with an error envelope", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { status: 503, errorType: "internal" } }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("health.api: markup instead of JSON is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>login</html>" }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("health.api: plain text with no envelope is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "000 HTTP Status Response - Unauthorized" }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("health.api: a network failure is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as HookContext;
  const r = await run(ctx);
  assertEquals(r.state, "down");
  assert(r.message!.includes("dns"));
});

Deno.test("health.service and quota: declared absences carry informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational", h.key);
    assert(h.unavailable?.reason && h.unavailable.reason.length > 0, h.key);
    assertEquals(h.check, undefined, `${h.key}: an unavailable entry has no hook`);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
