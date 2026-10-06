import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import service from "../health/service.ts";
import api from "../health/api.ts";
import quota, { headroom } from "../health/quota.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "./_helpers.ts";

type Checkable = { check?: unknown };
const check = (c: Checkable, ctx: HookContext) =>
  (c.check as (input: unknown, ctx: HookContext) => unknown)({}, ctx) as Promise<
    { state: string; message?: string; quota?: Array<Record<string, unknown>> }
  >;

Deno.test("health.service: declared unavailable at informational severity", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
  assertEquals(service.check, undefined);
});

Deno.test("health.api: a schema-correct 401 is a pass, unsigned", async () => {
  assertEquals(api.credential, "none");
  const { ctx, calls } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const r = await check(api, ctx);
  assertEquals(r.state, "ok");
  assertEquals(pathOf(calls[0].url), "/templates");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("health.api: HTML, 5xx and foreign JSON are not a pass", async () => {
  assertEquals(
    (await check(api, mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await check(api, mockCtx([{ status: 503, body: errorBody("x") }]).ctx)).state,
    "down",
  );
  assertEquals((await check(api, mockCtx([{ status: 200, body: { a: 1 } }]).ctx)).state, "unknown");
});

Deno.test("health.quota: reads X-RateLimit-* headers; reset is an epoch timestamp", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "42",
      "x-ratelimit-reset": "1790000000",
    },
  }]);
  const r = await check(quota, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0].limit, 60);
  assertEquals(r.quota?.[0].remaining, 42);
  assertEquals(r.quota?.[0].resetAt, new Date(1790000000 * 1000).toISOString());
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
});

Deno.test("health.quota: exhausted is down, nearly spent is degraded, no header is unknown", async () => {
  const h = (rem: string) => ({
    "content-type": "application/json",
    "x-ratelimit-limit": "60",
    "x-ratelimit-remaining": rem,
  });
  assertEquals((await check(quota, mockCtx([{ body: {}, headers: h("0") }]).ctx)).state, "down");
  assertEquals(
    (await check(quota, mockCtx([{ body: {}, headers: h("3") }]).ctx)).state,
    "degraded",
  );
  assertEquals((await check(quota, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals(headroom(undefined, 60), "unknown");
});
