import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const run = (h: typeof api, ctx: ReturnType<typeof mockCtx>["ctx"]) => h.check!({} as never, ctx);

Deno.test("api: declares an unsigned app-level dependency probe", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
});

Deno.test("api: probes balance unsigned and a schema-correct 401 is a PASS", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: errBody("Unauthorized", "권한이 없습니다."),
  }]);
  assertEquals((await run(api, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.solapi.com/cash/v1/balance");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: HTML is down, 5xx JSON is down, 429 and unrecognised JSON are unknown", async () => {
  const html = mockCtx([{ status: 200, body: "<html>shell</html>", headers: {} }]);
  assertEquals((await run(api, html.ctx)).state, "down");
  const five = mockCtx([{ status: 503, body: errBody("Unavailable", "x") }]);
  assertEquals((await run(api, five.ctx)).state, "down");
  const limited = mockCtx([{ status: 429, body: { errorCode: "TooManyRequests", message: "x" } }]);
  assertEquals((await run(api, limited.ctx)).state, "unknown");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(api, odd.ctx)).state, "unknown");
});

Deno.test("quota: declares a signed connection-scope quota probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});

Deno.test("quota: reports balance and points as two entries; ok when either is positive", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 5000, point: 0 } }]);
  const r = await run(quota, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [
    { id: "balance", remaining: 5000, unit: "KRW" },
    { id: "point", remaining: 0, unit: "KRW" },
  ]);
  assertEquals(calls[0].url, "https://api.solapi.com/cash/v1/balance");
  const pts = mockCtx([{ body: { balance: 0, point: 40 } }]);
  assertEquals((await run(quota, pts.ctx)).state, "ok");
});

Deno.test("quota: zero balance and zero points is degraded, never down", async () => {
  const { ctx } = mockCtx([{ body: { balance: 0, point: 0 } }]);
  assertEquals((await run(quota, ctx)).state, "degraded");
});

Deno.test("quota: errors, 429 and a body without a numeric balance are unknown", async () => {
  for (
    const r of [
      { status: 401, body: errBody("Unauthorized", "x") },
      { status: 429, body: { errorCode: "TooManyRequests", message: "x" } },
      { status: 200, body: { balance: "lots" } },
    ]
  ) {
    assertEquals((await run(quota, mockCtx([r]).ctx)).state, "unknown");
  }
});

Deno.test("service: a declared absence at informational severity", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.check, undefined);
});
