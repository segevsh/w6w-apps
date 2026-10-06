import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const run = (c: typeof api, ctx: ReturnType<typeof mockCtx>["ctx"]) => c.check!({} as never, ctx);

Deno.test("service: declared unavailable at informational severity", () => {
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
});

Deno.test("api: a schema-correct auth error is a pass; 5xx is down; odd body degraded", async () => {
  const ok = mockCtx([{ status: 403, body: ["Error", "Forbidden"] }]);
  assertEquals((await run(api, ok.ctx)).state, "ok");
  assertEquals(ok.calls[0].headers["authorization"], undefined);
  assertEquals((await run(api, mockCtx([{ status: 500, body: "x" }]).ctx)).state, "down");
  assertEquals((await run(api, mockCtx([{ status: 200, body: "<html>" }]).ctx)).state, "degraded");
  const boom = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  assertEquals((await run(api, boom as never)).state, "down");
});

const usage = (u: Record<string, unknown>) => ({ body: { limits_and_usage: u } });

Deno.test("quota: reports remaining units for the key and workspace, worst bucket wins", async () => {
  const r = await run(
    quota,
    mockCtx([usage({
      units_limit_api_key: 1000,
      units_usage_api_key: 100,
      units_limit_workspace: 1000,
      units_usage_workspace: 950,
      usage_reset_date: "2026-11-01T00:00:00Z",
    })]).ctx,
  );
  assertEquals(r.state, "degraded");
  assertEquals(r.quota?.map((q) => [q.id, q.remaining]), [["api-key", 900], ["workspace", 50]]);
  assertEquals(r.quota?.[0].resetAt, "2026-11-01T00:00:00.000Z");
});

Deno.test("quota: exhausted is down; null limits and failures are unknown", async () => {
  const gone = await run(
    quota,
    mockCtx([usage({ units_limit_api_key: 10, units_usage_api_key: 10 })]).ctx,
  );
  assertEquals(gone.state, "down");
  const none = await run(
    quota,
    mockCtx([usage({ units_limit_api_key: null, units_limit_workspace: null })]).ctx,
  );
  assertEquals(none.state, "unknown");
  assertEquals(
    (await run(quota, mockCtx([{ status: 401, body: ["Error", "x"] }]).ctx)).state,
    "unknown",
  );
  assertEquals((await run(quota, mockCtx([{ body: {} }]).ctx)).state, "unknown");
});
