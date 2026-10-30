import { test } from "node:test";
import { assertEquals } from "./_assert.ts";
import service from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx, pathOf } from "./_helpers.ts";

test("health: service is a declared absence with informational severity", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.check, undefined);
  assertEquals(service.unavailable!.reason.includes("status.samcart.com"), true);
});

// deno-lint-ignore no-explicit-any
const check = (ctx: unknown) => (quota.check as any)({}, ctx);

test("health: quota is a signed informational probe on the API host", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

test("health: quota reads the RateLimit headers", async () => {
  const { ctx, calls } = mockCtx([{
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "240",
      "ratelimit-remaining": "187",
      "ratelimit-reset": "22",
    },
    body: { data: [] },
  }]);
  const out = await check(ctx);
  assertEquals(pathOf(calls[0].url), "/v1/products");
  assertEquals(out.state, "ok");
  assertEquals(out.quota[0].limit, 240);
  assertEquals(out.quota[0].remaining, 187);
});

test("health: quota degrades below 5% remaining", async () => {
  const { ctx } = mockCtx([{
    headers: { "ratelimit-limit": "120", "ratelimit-remaining": "3", "ratelimit-reset": "9" },
    body: { data: [] },
  }]);
  assertEquals((await check(ctx)).state, "degraded");
});

test("health: quota is unknown, not down, without the headers", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "nope" } }]);
  assertEquals((await check(ctx)).state, "unknown");
});

test("health: quota is unknown when the host is unreachable", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  assertEquals((await check(ctx)).state, "unknown");
});
