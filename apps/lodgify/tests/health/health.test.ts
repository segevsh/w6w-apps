import { assert, assertEquals } from "@std/assert";
import type { HealthCheckDefinition, HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import api from "../../health/api.ts";
import reachability from "../../health/reachability.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const run = (c: HealthCheckDefinition, ctx: HookContext) =>
  (c.check as unknown as (i: unknown, c: HookContext) => Promise<
    { state: string; message?: string }
  >)({}, ctx);

Deno.test("api: a property page is ok, and the probe is the signed v2 list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: 1 }] } }]);
  assertEquals((await run(api, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.lodgify.com/v2/properties?size=1");
  assertEquals(api.credential, "signed");
  assertEquals(calls[0].headers["x-apikey"], undefined, "the check never sets the key itself");
});

Deno.test("api: 403/401 is degraded (the API answered), 429 degraded, 5xx down", async () => {
  const cases: Array<[number, string]> = [[403, "degraded"], [401, "degraded"], [429, "degraded"], [
    503,
    "down",
  ]];
  for (const [status, state] of cases) {
    const { ctx } = mockCtx([{ status, body: undefined }]);
    assertEquals((await run(api, ctx)).state, state, `HTTP ${status}`);
  }
});

Deno.test("api: a 200 that is not a property page is not ok", async () => {
  const { ctx } = mockCtx([{ body: "<html></html>" }]);
  assertEquals((await run(api, ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals((await run(api, ctx)).state, "down");
});

Deno.test("reachability: the documented country list is ok, unsigned, informational", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ code: "AF", name: "Afghanistan" }] }]);
  assertEquals((await run(reachability, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.lodgify.com/v1/countries");
  assertEquals(reachability.credential, "none");
  assertEquals(reachability.severity, "informational");
});

Deno.test("reachability: a 200 that is not the country list is degraded, never ok or down", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await run(reachability, ctx)).state, "degraded");
  const down = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals((await run(reachability, down)).state, "unknown");
});

Deno.test("service and quota: declared absences at informational severity, no hook", () => {
  for (const c of [service, quota]) {
    assertEquals(c.severity, "informational");
    assert(c.unavailable !== undefined && c.unavailable.reason.length > 0);
    assertEquals(c.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
