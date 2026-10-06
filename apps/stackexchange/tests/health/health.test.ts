import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const OK = { items: [{ total_questions: 1 }], quota_max: 300, quota_remaining: 296 };
// deno-lint-ignore no-explicit-any
const run = (c: any, ctx: any) => c.check({}, ctx);

Deno.test("service: declared unavailable and informational", () => {
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
});

Deno.test("api: schema-correct wrapper is ok; backoff degrades", async () => {
  const ok = await run(api, mockCtx([{ body: OK }]).ctx);
  assertEquals(ok.state, "ok");
  const slow = await run(api, mockCtx([{ body: { ...OK, backoff: 10 } }]).ctx);
  assertEquals(slow.state, "degraded");
});

Deno.test("api: 5xx is down, HTML 200 is degraded, network error is down", async () => {
  const five = await run(
    api,
    mockCtx([{
      status: 502,
      body: { error_id: 502, error_name: "throttle_violation", error_message: "x" },
    }]).ctx,
  );
  assertEquals(five.state, "down");
  const html = await run(
    api,
    mockCtx([{ body: "<html/>", headers: { "content-type": "text/html" } }]).ctx,
  );
  assertEquals(html.state, "degraded");
  const ctx = mockCtx().ctx;
  ctx.fetch = (() => Promise.reject(new Error("dns"))) as unknown as typeof fetch;
  assertEquals((await run(api, ctx)).state, "down");
});

Deno.test("quota: reads remaining/limit and grades headroom", async () => {
  const ok = await run(quota, mockCtx([{ body: OK }]).ctx);
  assertEquals(ok.state, "ok");
  assertEquals(ok.quota, [{ id: "daily", limit: 300, remaining: 296, unit: "requests" }]);
  const warn = await run(quota, mockCtx([{ body: { ...OK, quota_remaining: 20 } }]).ctx);
  assertEquals(warn.state, "degraded");
  const out = await run(quota, mockCtx([{ body: { ...OK, quota_remaining: 0 } }]).ctx);
  assertEquals(out.state, "down");
  const unk = await run(quota, mockCtx([{ status: 400, body: { error_id: 400 } }]).ctx);
  assertEquals(unk.state, "unknown");
});
